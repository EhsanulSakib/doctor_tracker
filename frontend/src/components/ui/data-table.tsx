"use client";

import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { Fragment, useState, type MouseEvent, type ReactNode } from "react";
import { listItem, listStagger } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { IconButton } from "./icon-button";
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, SortIcon } from "./icons";
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
  /** Per-row buttons (view, edit, delete), right-aligned / in the card corner. */
  rowActions?: (row: T) => ReactNode;
  /** Visible heading of the actions column. */
  actionsHeader?: string;
  /**
   * Makes the whole row (and card) clickable, e.g. to open the record. Keyboard users still have the
   * link in the first cell; clicks on buttons and links inside the row keep doing their own thing.
   */
  onRowClick?: (row: T) => void;
  /**
   * Adds a down-arrow button to each row (after the row actions) that opens a panel under the row.
   * `render` only runs while the panel is open, so its content can load lazily.
   */
  expandable?: { render: (row: T) => ReactNode; label: (row: T) => string };
  empty?: ReactNode;
  loading?: boolean;
  skeletonRows?: number;
  /**
   * Laptops and up: take the height that's left (inside a flex column) and scroll the rows inside the
   * table, with a sticky header, instead of growing the page.
   */
  fill?: boolean;
  /**
   * Where the table replaces the cards: `md` (default), `lg` (wide tables: tablets get two-column cards)
   * or `xl` (tables in a half-width panel: one column of cards until the panel is wide enough).
   */
  cardsBelow?: "md" | "lg" | "xl";
  /** Extra classes for the card grid (e.g. one column inside a half-width panel). */
  cardsClassName?: string;
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
  actionsHeader = "Actions",
  onRowClick,
  expandable,
  empty,
  loading = false,
  skeletonRows = 6,
  fill = false,
  cardsBelow = "md",
  cardsClassName,
}: DataTableProps<T>) {
  // Server-rendered rows are visible immediately (no hidden-until-hydrated content); after that, a
  // new page of rows mounts a new body (key) and staggers in.
  const isClient = useIsClient();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const hasActions = !!rowActions;
  const expandButton = (row: T) => {
    if (!expandable) return null;
    const open = expanded.has(getRowId(row));
    return (
      <IconButton
        size="sm"
        label={expandable.label(row)}
        aria-expanded={open}
        icon={<ChevronDownIcon className={cn("transition-transform duration-200", open && "rotate-180")} />}
        onClick={() => toggle(getRowId(row))}
        className={cn("hover:bg-accent-soft hover:text-accent-fg", open && "bg-accent-soft text-accent-fg")}
      />
    );
  };
  const initial = isClient ? "hidden" : false;
  const rowsKey = rows.length ? `${rows.length}:${getRowId(rows[0]!)}:${getRowId(rows.at(-1)!)}` : "empty";

  if (!loading && rows.length === 0) {
    return (
      <div className="rounded-panel border border-line bg-surface shadow-card">{empty ?? <EmptyState title="Nothing to show yet" />}</div>
    );
  }

  // A click on a control inside the row (link, button, menu) is not a click on the row.
  const rowClick = onRowClick
    ? (row: T) => (event: MouseEvent<HTMLElement>) => {
        if ((event.target as HTMLElement).closest("a, button, input, select, textarea, label, [role='menuitem']")) return;
        onRowClick(row);
      }
    : undefined;

  const titleColumn = columns.find((c) => c.mobile === "title") ?? columns[0];
  const metaColumns = columns.filter((c) => c.mobile === "meta");
  const fieldColumns = columns.filter((c) => c !== titleColumn && (c.mobile ?? "field") === "field");

  return (
    <>
      {/* Desktop / tablet: a real table. */}
      <div
        className={cn(
          // shrink-0: inside a flex column the table keeps its full height (the page scrolls, not the table).
          "hidden shrink-0 overflow-x-auto rounded-panel border border-line bg-surface shadow-card scrollbar-thin",
          cardsBelow === "xl" ? "xl:block" : cardsBelow === "lg" ? "lg:block" : "md:block",
          fill && "lg:min-h-0 lg:overflow-auto",
        )}
      >
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-paper/70">
              {expandable && (
                <th scope="col" className={cn("w-px bg-paper py-3 pr-0 pl-4 shadow-table-head", fill && "lg:sticky lg:top-0 lg:z-10")}>
                  <span className="sr-only">Show patients</span>
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={ariaSort(column.sort, sort)}
                  className={cn(
                    // The bottom rule is a shadow: a border on a sticky header row scrolls away with the rows.
                    "whitespace-nowrap bg-paper px-4 py-3 text-left text-label font-semibold uppercase text-ink-subtle shadow-table-head first:pl-5",
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
              {hasActions && (
                <th
                  scope="col"
                  className={cn(
                    "w-px whitespace-nowrap bg-paper px-4 py-3 pr-5 text-right text-label font-semibold uppercase text-ink-subtle shadow-table-head",
                    fill && "lg:sticky lg:top-0 lg:z-10",
                  )}
                >
                  {actionsHeader}
                </th>
              )}
            </tr>
          </thead>

          {loading ? (
            <tbody>
              {Array.from({ length: skeletonRows }, (_, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {expandable && <td className="py-3 pr-0 pl-4" />}
                  {columns.map((column) => (
                    <td key={column.id} className={cn("px-4 py-3", column.className)}>
                      {column.skeleton ?? <Skeleton className={cn("my-0.5 h-4", column.align === "right" ? "ml-auto w-12" : "w-3/4")} />}
                    </td>
                  ))}
                  {hasActions && <td className="px-4 py-3" />}
                </tr>
              ))}
            </tbody>
          ) : (
            <m.tbody key={rowsKey} variants={listStagger} initial={initial} animate="visible">
              {rows.map((row) => {
                const id = getRowId(row);
                const open = expandable && expanded.has(id);
                return (
                  <Fragment key={id}>
                    <m.tr
                      variants={listItem}
                      onClick={rowClick?.(row)}
                      className={cn(
                        "group/row border-b border-line transition-colors duration-150 last:border-0 hover:bg-accent-soft/40",
                        // An accent bar on the left edge of the hovered (or expanded) row.
                        "[&>td:first-child]:shadow-[inset_3px_0_0_transparent] hover:[&>td:first-child]:shadow-[inset_3px_0_0_var(--color-accent)]",
                        open && "bg-accent-soft/30 [&>td:first-child]:shadow-[inset_3px_0_0_var(--color-accent)]",
                        onRowClick && "cursor-pointer",
                      )}
                    >
                      {expandable && <td className="w-px py-3.5 pr-0 pl-4 align-middle transition-[box-shadow]">{expandButton(row)}</td>}
                      {columns.map((column) => (
                        <td
                          key={column.id}
                          className={cn(
                            "px-4 py-3.5 align-middle transition-[box-shadow] first:pl-5",
                            column.align === "right" && "whitespace-nowrap text-right tabular-nums",
                            column.className,
                          )}
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                      {hasActions && (
                        <td className="px-3 py-2 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1">{rowActions?.(row)}</div>
                        </td>
                      )}
                    </m.tr>
                    {open && (
                      <tr className="border-b border-line bg-paper/50 last:border-0">
                        {/* Wider than the visible columns on purpose: hidden columns still count in colSpan. */}
                        <td colSpan={columns.length + (expandable ? 1 : 0) + (rowActions ? 1 : 0)} className="p-0">
                          {/* width 0 + min-width 100%: the panel fills the row but never widens a column,
                              so opening a row doesn't shift the table. */}
                          <m.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                            style={{ width: 0, minWidth: "100%" }}
                            className="overflow-hidden"
                          >
                            {expandable.render(row)}
                          </m.div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </m.tbody>
          )}
        </table>
      </div>

      {/* Phones: one card per row (a wide table would scroll sideways). */}
      {/* grid-cols-1 = minmax(0, 1fr): a long unbroken value (email) truncates instead of widening the card past the screen. */}
      <ul
        className={cn(
          "grid grid-cols-1 gap-2",
          cardsBelow === "xl" ? "sm:grid-cols-2 sm:gap-3 xl:hidden" : cardsBelow === "lg" ? "md:grid-cols-2 md:gap-3 lg:hidden" : "md:hidden",
          cardsClassName,
        )}
        aria-label={caption}
      >
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
                onClick={rowClick?.(row)}
                className={cn(
                  "rounded-panel border border-line bg-surface p-4 shadow-card transition-[border-color,box-shadow,transform] duration-150",
                  onRowClick && "cursor-pointer hover:-translate-y-px hover:border-accent/40 hover:shadow-overlay",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {titleColumn && <div className="font-medium text-ink">{titleColumn.cell(row)}</div>}
                    {metaColumns.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-ui text-ink-muted">
                        {metaColumns.map((column) => (
                          <span key={column.id}>{column.cell(row)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {(hasActions || expandable) && (
                    <div className="-mr-2 -mt-1.5 flex shrink-0 items-center">
                      {rowActions?.(row)}
                      {expandButton(row)}
                    </div>
                  )}
                </div>
                {fieldColumns.length > 0 && (
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-line pt-3 text-ui">
                    {fieldColumns.map((column) => (
                      <div key={column.id} className="min-w-0">
                        <dt className="text-label uppercase text-ink-muted">{column.header}</dt>
                        {/* Clip sideways only (ellipsis still works): a link's enlarged tap area may reach above and below. */}
                        <dd className="mt-0.5 overflow-x-clip text-ellipsis whitespace-nowrap text-ink">{column.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <AnimatePresence initial={false}>
                  {expandable && expanded.has(getRowId(row)) && (
                    <m.div
                      key="panel"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="-mx-4 -mb-4 mt-3 overflow-hidden rounded-b-panel border-t border-line bg-paper/50"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {expandable.render(row)}
                    </m.div>
                  )}
                </AnimatePresence>
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
    "group -mx-1.5 inline-flex items-center gap-1 rounded-mark px-1.5 py-0.5 uppercase transition-colors hover:text-ink focus-ring",
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
