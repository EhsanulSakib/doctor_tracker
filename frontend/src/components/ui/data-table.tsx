"use client";

import { m } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { listItem, listStagger } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { ArrowDownIcon, ArrowUpIcon, SortIcon } from "./icons";
import { useIsClient } from "./portal";
import { Skeleton } from "./skeleton";

export type ColumnSort = {
  /** URL sort values, e.g. `{ asc: "name", desc: "-name" }`. */
  asc: string;
  desc: string;
  /** Direction on the first click (dates usually start newest-first). */
  first?: "asc" | "desc";
};

export type Column<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  sort?: ColumnSort;
  /** Classes for the column's cells (width, wrapping). */
  className?: string;
  /** On phones: card heading, the line under it, a "label: value" field (default), or hidden. */
  mobile?: "title" | "meta" | "field" | "hidden";
  /** Loading placeholder for this column's cells, when the real cell isn't one 20px line (avatar + two lines…). */
  skeleton?: ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Read by screen readers as the table's name. */
  caption: string;
  /** Current sort value (from the URL). */
  sort?: string;
  /** URL-driven sorting: builds the link for a sort value… */
  sortHref?: (sort: string) => string;
  /** …or state-driven sorting. */
  onSortChange?: (sort: string) => void;
  /** Per-row buttons (edit, delete), right-aligned / in the card corner. */
  rowActions?: (row: T) => ReactNode;
  empty?: ReactNode;
  loading?: boolean;
  skeletonRows?: number;
  /**
   * Laptops and up: take the height that's left (inside a flex column) and scroll the rows inside the
   * table, with a sticky header, instead of growing the page.
   */
  fill?: boolean;
};

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  sort,
  sortHref,
  onSortChange,
  rowActions,
  empty,
  loading = false,
  skeletonRows = 6,
  fill = false,
}: DataTableProps<T>) {
  // Server-rendered rows are visible immediately (no hidden-until-hydrated content); after that, a
  // new page of rows mounts a new body (key) and staggers in.
  const isClient = useIsClient();
  const initial = isClient ? "hidden" : false;
  const rowsKey = rows.length ? `${rows.length}:${getRowId(rows[0]!)}:${getRowId(rows.at(-1)!)}` : "empty";

  if (!loading && rows.length === 0) {
    return (
      <div className="rounded-panel border border-line bg-surface shadow-card">{empty ?? <EmptyState title="Nothing to show yet" />}</div>
    );
  }

  const titleColumn = columns.find((c) => c.mobile === "title") ?? columns[0];
  const metaColumns = columns.filter((c) => c.mobile === "meta");
  const fieldColumns = columns.filter((c) => c !== titleColumn && (c.mobile ?? "field") === "field");

  return (
    <>
      {/* Desktop / tablet: a real table. */}
      <div
        className={cn(
          "hidden overflow-x-auto rounded-panel border border-line bg-surface shadow-card scrollbar-thin md:block",
          fill && "lg:min-h-0 lg:overflow-auto",
        )}
      >
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-paper">
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={ariaSort(column.sort, sort)}
                  className={cn(
                    // The bottom rule is a shadow: a border on a sticky header row scrolls away with the rows.
                    "whitespace-nowrap bg-paper px-4 py-3 text-left text-label font-semibold uppercase text-ink-muted shadow-[inset_0_-1px_0_var(--line)]",
                    fill && "lg:sticky lg:top-0 lg:z-10",
                    column.align === "right" && "text-right",
                    column.className,
                  )}
                >
                  {column.sort ? (
                    <SortHeader column={column} sort={column.sort} current={sort} sortHref={sortHref} onSortChange={onSortChange} />
                  ) : (
                    column.header
                  )}
                </th>
              ))}
              {rowActions && (
                <th scope="col" className={cn("w-px bg-paper px-4 py-2.5 shadow-[inset_0_-1px_0_var(--line)]", fill && "lg:sticky lg:top-0 lg:z-10")}>
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>

          {loading ? (
            <tbody>
              {Array.from({ length: skeletonRows }, (_, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {columns.map((column) => (
                    <td key={column.id} className={cn("px-4 py-3", column.className)}>
                      {column.skeleton ?? <Skeleton className={cn("my-0.5 h-4", column.align === "right" ? "ml-auto w-12" : "w-3/4")} />}
                    </td>
                  ))}
                  {rowActions && <td className="px-4 py-3" />}
                </tr>
              ))}
            </tbody>
          ) : (
            <m.tbody key={rowsKey} variants={listStagger} initial={initial} animate="visible">
              {rows.map((row) => (
                <m.tr
                  key={getRowId(row)}
                  variants={listItem}
                  className="border-b border-line transition-colors last:border-0 hover:bg-paper/80"
                >
                  {columns.map((column) => (
                    <td key={column.id} className={cn("px-4 py-3 align-middle", column.align === "right" && "whitespace-nowrap text-right tabular-nums", column.className)}>
                      {column.cell(row)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-2 py-1.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">{rowActions(row)}</div>
                    </td>
                  )}
                </m.tr>
              ))}
            </m.tbody>
          )}
        </table>
      </div>

      {/* Phones: one card per row (a wide table would scroll sideways). */}
      {/* grid-cols-1 = minmax(0, 1fr): a long unbroken value (email) truncates instead of widening the card past the screen. */}
      <ul className="grid grid-cols-1 gap-2 md:hidden" aria-label={caption}>
        {loading
          ? Array.from({ length: Math.min(skeletonRows, 4) }, (_, i) => (
              <li key={i} className="grid gap-3 rounded-panel border border-line bg-surface p-4 shadow-card">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-2/3" />
              </li>
            ))
          : rows.map((row) => (
              <m.li
                key={`${rowsKey}-${getRowId(row)}`}
                variants={listItem}
                initial={initial}
                animate="visible"
                className="rounded-panel border border-line bg-surface p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {titleColumn && <div className="font-medium text-ink">{titleColumn.cell(row)}</div>}
                    {metaColumns.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
                        {metaColumns.map((column) => (
                          <span key={column.id}>{column.cell(row)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {rowActions && <div className="-mr-2 -mt-1.5 flex shrink-0 items-center">{rowActions(row)}</div>}
                </div>
                {fieldColumns.length > 0 && (
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-line pt-3 text-[13px]">
                    {fieldColumns.map((column) => (
                      <div key={column.id} className="min-w-0">
                        <dt className="text-label uppercase text-ink-muted">{column.header}</dt>
                        <dd className="mt-0.5 truncate text-ink">{column.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </m.li>
            ))}
      </ul>
    </>
  );
}

function directionOf(columnSort: ColumnSort | undefined, current: string | undefined) {
  if (!columnSort || !current) return null;
  if (current === columnSort.asc) return "asc";
  if (current === columnSort.desc) return "desc";
  return null;
}

function ariaSort(columnSort: ColumnSort | undefined, current: string | undefined) {
  const direction = directionOf(columnSort, current);
  return direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined;
}

function SortHeader<T>({
  column,
  sort,
  current,
  sortHref,
  onSortChange,
}: {
  column: Column<T>;
  sort: ColumnSort;
  current?: string;
  sortHref?: (sort: string) => string;
  onSortChange?: (sort: string) => void;
}) {
  const direction = directionOf(sort, current);
  const nextDirection = direction ? (direction === "asc" ? "desc" : "asc") : (sort.first ?? "asc");
  const next = nextDirection === "asc" ? sort.asc : sort.desc;

  const className = cn(
    "group -mx-1.5 inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 uppercase transition-colors hover:text-ink focus-ring",
    direction && "text-ink",
    column.align === "right" && "flex-row-reverse",
  );
  const content = (
    <>
      {column.header}
      {direction === "asc" ? (
        <ArrowUpIcon size={13} />
      ) : direction === "desc" ? (
        <ArrowDownIcon size={13} />
      ) : (
        <SortIcon size={13} className="opacity-40 transition-opacity group-hover:opacity-100" />
      )}
      <span className="sr-only">, sort {nextDirection === "asc" ? "ascending" : "descending"}</span>
    </>
  );

  return sortHref ? (
    <Link href={sortHref(next)} scroll={false} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={() => onSortChange?.(next)} className={className}>
      {content}
    </button>
  );
}
