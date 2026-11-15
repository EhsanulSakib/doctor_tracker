"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";
import { PAGE_SIZES } from "@/lib/constants";
import { cn, formatNumber } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { Select } from "./select";

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  /** URL-driven paging (preferred: shareable, back button works, links prefetch)… */
  hrefForPage?: (page: number) => string;
  /** …or state-driven. */
  onPageChange?: (page: number) => void;
  /** Shows the "Rows" size picker. */
  onLimitChange?: (limit: number) => void;
  limitOptions?: readonly number[];
};

/** `1 … 4 5 6 … 25`: first, last, current ±1, with gaps; never a gap that hides a single page. */
export function pageItems(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    const previous = sorted[i - 1];
    if (previous !== undefined && p - previous === 2) items.push(previous + 1);
    else if (previous !== undefined && p - previous > 2) items.push("gap");
    items.push(p);
  });
  return items;
}

export function Pagination({ page, totalPages, total, limit, hrefForPage, onPageChange, onLimitChange, limitOptions = PAGE_SIZES }: PaginationProps) {
  const limitLabelId = useId();
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const pageControl = (target: number, content: ReactNode, options: { label: string; current?: boolean; disabled?: boolean }) => {
    const className = cn(
      "inline-flex h-8 min-w-8 items-center justify-center rounded-control px-2 text-[13px] tabular-nums transition-colors focus-ring pointer-coarse:h-10 pointer-coarse:min-w-10",
      options.current ? "bg-accent font-medium text-accent-ink" : "text-ink-muted hover:bg-paper-2 hover:text-ink",
      options.disabled && "pointer-events-none opacity-40",
    );
    if (options.disabled) {
      return (
        <span aria-disabled="true" aria-label={options.label} className={className}>
          {content}
        </span>
      );
    }
    if (hrefForPage) {
      return (
        <Link href={hrefForPage(target)} aria-label={options.label} aria-current={options.current ? "page" : undefined} className={className}>
          {content}
        </Link>
      );
    }
    return (
      <button type="button" onClick={() => onPageChange?.(target)} aria-label={options.label} aria-current={options.current ? "page" : undefined} className={className}>
        {content}
      </button>
    );
  };

  return (
    <nav aria-label="Pagination" className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
      <div className="flex items-center gap-4 text-[13px] text-ink-muted">
        <p className="tabular-nums">
          {total === 0 ? (
            "No results"
          ) : (
            <>
              Showing <span className="font-medium text-ink">{from}–{to}</span> of{" "}
              <span className="font-medium text-ink">{formatNumber(total)}</span>
            </>
          )}
        </p>
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <span id={limitLabelId}>Rows</span>
            <Select
              size="sm"
              labelId={limitLabelId}
              value={String(limit)}
              options={limitOptions.map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(value) => onLimitChange(Number(value))}
              className="w-[4.75rem]"
            />
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {pageControl(page - 1, <ChevronLeftIcon />, { label: "Previous page", disabled: page <= 1 })}
          <ul className="hidden items-center gap-1 sm:flex">
            {pageItems(page, totalPages).map((item, i) =>
              item === "gap" ? (
                <li key={`gap-${i}`} aria-hidden className="w-6 text-center text-ink-subtle">
                  …
                </li>
              ) : (
                <li key={item}>{pageControl(item, item, { label: `Page ${item}`, current: item === page })}</li>
              ),
            )}
          </ul>
          <span className="px-2 text-[13px] tabular-nums text-ink-muted sm:hidden">
            Page {page} of {totalPages}
          </span>
          {pageControl(page + 1, <ChevronRightIcon />, { label: "Next page", disabled: page >= totalPages })}
        </div>
      )}
    </nav>
  );
}
