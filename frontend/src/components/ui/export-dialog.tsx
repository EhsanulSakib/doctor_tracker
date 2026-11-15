"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { isApiError } from "@/lib/api/errors";
import { cellText, exportTable, type ExportColumn, type ExportFormat } from "@/lib/export";
import { EASE_OUT } from "@/lib/motion";
import { cn, formatDateTime, formatNumber, todayIso } from "@/lib/utils";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { CheckIcon, DownloadIcon, FileTextIcon, FilterIcon, SheetIcon, UsersIcon } from "./icons";
import { Select } from "./select";
import { Skeleton } from "./skeleton";

export type ExportScope = "filtered" | "all" | "page" | "custom";

/** A dropdown shown under "Custom export" (e.g. status); its value reaches `load` as `custom[key]`. */
export type ExportCustomFilter = { key: string; label: string; options: { value: string; label: string }[]; emptyOption: string };

type ExportDialogProps<T> = {
  open: boolean;
  onClose: () => void;
  /** "doctor" / "doctors": used in the title, counts and file name. */
  noun: { one: string; many: string };
  columns: ExportColumn<T>[];
  /** Columns of a quick (non-custom) export. */
  defaultColumnIds: string[];
  /** The rows on screen ("current page"). */
  pageRows: T[];
  page: number;
  /** How many rows match the current search and filters. */
  filteredTotal: number;
  hasFilters: boolean;
  customFilters: ExportCustomFilter[];
  /** Every row for a scope (the API pages at 50, so this may take several requests). */
  load: (scope: Exclude<ExportScope, "page">, custom: Record<string, string>, signal: AbortSignal) => Promise<T[]>;
  getRowId: (row: T) => string;
  /** Icon of the "current page" option. */
  pageIcon: ReactNode;
};

const PREVIEW_ROWS = 5;
const capitalize = (text: string) => `${text[0]!.toUpperCase()}${text.slice(1)}`;

/**
 * Export to PDF or CSV: the filtered rows, all rows, the current page, or a custom set (filters and
 * columns), with a live preview of exactly what goes into the file. Shared by the doctors and patients lists.
 */
export function ExportDialog<T>(props: ExportDialogProps<T>) {
  // Remounted on every open: always starts from "filtered", PDF, default columns.
  return (
    <Dialog open={props.open} onClose={props.onClose} size="xl" title={`Export ${props.noun.many}`}>
      {props.open && <ExportBody {...props} />}
    </Dialog>
  );
}

function ExportBody<T>({
  onClose,
  noun,
  columns: columnsAll,
  defaultColumnIds,
  pageRows,
  page,
  filteredTotal,
  hasFilters,
  customFilters,
  load,
  getRowId,
  pageIcon,
}: ExportDialogProps<T>) {
  const toast = useToast();
  const [scope, setScope] = useState<ExportScope>("filtered");
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [customColumns, setCustomColumns] = useState<string[]>(defaultColumnIds);
  const [exporting, setExporting] = useState(false);

  // The current page is already on screen; every other scope is fetched (again when its filters change).
  const queryKey = scope === "page" ? null : JSON.stringify([scope, scope === "custom" ? custom : null]);
  const [result, setResult] = useState<{ key: string; rows: T[] } | { key: string; error: string } | null>(null);
  useEffect(() => {
    if (scope === "page" || !queryKey) return;
    const controller = new AbortController();
    load(scope, custom, controller.signal)
      .then((rows) => setResult({ key: queryKey, rows }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResult({ key: queryKey, error: isApiError(error) ? error.message : `Couldn't load the ${noun.many}.` });
      });
    return () => controller.abort();
  }, [queryKey, scope, custom, load, noun.many]);

  const loading = !!queryKey && result?.key !== queryKey;
  const error = !loading && result && "error" in result ? result.error : null;
  const rows: T[] = !queryKey ? pageRows : !loading && result && "rows" in result ? result.rows : [];

  const columnIds = scope === "custom" ? customColumns : defaultColumnIds;
  const columns = columnsAll.filter((c) => columnIds.includes(c.id));

  const scopes: { id: ExportScope; title: string; detail: string; icon: ReactNode }[] = [
    {
      id: "filtered",
      title: "Export filtered data",
      detail: hasFilters ? `${formatNumber(filteredTotal)} ${noun.many} matching your search and filters` : `No filters applied: same as all ${noun.many}`,
      icon: <FilterIcon size={18} />,
    },
    { id: "all", title: "Export all", detail: `Every ${noun.one} in the tracker`, icon: <UsersIcon size={18} /> },
    { id: "page", title: "Export current page", detail: `${formatNumber(pageRows.length)} ${noun.many} on page ${page}`, icon: pageIcon },
    { id: "custom", title: "Custom export", detail: `Pick the columns and filter the ${noun.many}`, icon: <CheckIcon size={18} /> },
  ];
  const scopeTitle = scopes.find((s) => s.id === scope)!.title.replace(/^Export /, "");
  const fileName = `${noun.many}-${scope}-${todayIso()}`;

  const toggleColumn = (id: string) =>
    setCustomColumns((current) => (current.includes(id) ? current.filter((c) => c !== id) : columnsAll.map((c) => c.id).filter((c) => c === id || current.includes(c))));

  const runExport = async () => {
    setExporting(true);
    try {
      await exportTable(
        {
          title: capitalize(noun.many),
          subtitle: `${capitalize(scopeTitle)} · ${formatNumber(rows.length)} ${noun.many} · exported ${formatDateTime(new Date())}`,
          columns,
          rows,
          fileName,
        },
        format,
      );
      toast.success("Export ready", `${fileName}.${format} (${formatNumber(rows.length)} ${noun.many})`);
      onClose();
    } catch {
      toast.error("Couldn't create the file", "Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* 1. Scope */}
      <section aria-labelledby="export-scope" className="grid gap-2.5">
        <h3 id="export-scope" className="text-sm font-semibold text-ink">
          What to export
        </h3>
        <div role="radiogroup" aria-labelledby="export-scope" className="grid gap-2 sm:grid-cols-2">
          {scopes.map((option) => {
            const selected = option.id === scope;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setScope(option.id)}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-control border p-3 text-left transition-[border-color,background-color,box-shadow] focus-ring",
                  selected ? "border-accent bg-accent-soft/50 shadow-[0_0_0_1px_var(--color-accent)]" : "border-line hover:border-line-strong hover:bg-paper-2",
                )}
              >
                <span className={cn("mt-0.5 shrink-0", selected ? "text-accent-fg" : "text-ink-muted")}>{option.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{option.title}</span>
                  <span className="mt-0.5 block text-ui text-ink-muted">{option.detail}</span>
                </span>
                <span
                  aria-hidden
                  className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", selected ? "border-accent bg-accent text-accent-ink" : "border-line-strong")}
                >
                  {selected && <span className="size-1.5 rounded-full bg-current" />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Custom options */}
      <AnimatePresence initial={false}>
        {scope === "custom" && (
          <m.section
            key="custom"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="overflow-hidden"
            aria-label="Custom export options"
          >
            <div className="grid gap-4 rounded-control border border-line bg-paper/60 p-4">
              {customFilters.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {customFilters.map((filter) => (
                    <Select
                      key={filter.key}
                      aria-label={filter.label}
                      value={custom[filter.key] ?? ""}
                      onChange={(value) => setCustom((current) => ({ ...current, [filter.key]: value }))}
                      options={filter.options}
                      emptyOption={filter.emptyOption}
                    />
                  ))}
                </div>
              )}
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-ui font-medium text-ink">Columns ({customColumns.length})</p>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setCustomColumns(columnsAll.map((c) => c.id))}>
                      Select all
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCustomColumns(defaultColumnIds)}>
                      Reset
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {columnsAll.map((column) => {
                    const on = customColumns.includes(column.id);
                    return (
                      <button
                        key={column.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleColumn(column.id)}
                        className={cn(
                          "inline-flex h-7 cursor-pointer items-center gap-1 rounded-control border px-2.5 text-ui transition-colors focus-ring",
                          on ? "border-accent/50 bg-accent-soft text-accent-fg" : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
                        )}
                      >
                        {on && <CheckIcon size={12} />}
                        {column.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </m.section>
        )}
      </AnimatePresence>

      {/* 3. Format */}
      <section aria-labelledby="export-format" className="grid gap-2.5">
        <h3 id="export-format" className="text-sm font-semibold text-ink">
          File type
        </h3>
        <div role="radiogroup" aria-labelledby="export-format" className="grid grid-cols-2 gap-2 sm:max-w-md">
          {(
            [
              { id: "pdf", label: "PDF", detail: "Printable table", icon: <FileTextIcon size={18} /> },
              { id: "csv", label: "CSV", detail: "Excel / Google Sheets", icon: <SheetIcon size={18} /> },
            ] as const
          ).map((option) => {
            const selected = option.id === format;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setFormat(option.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-control border p-3 text-left transition-[border-color,background-color] focus-ring",
                  selected ? "border-accent bg-accent-soft/50" : "border-line hover:border-line-strong hover:bg-paper-2",
                )}
              >
                <span className={selected ? "text-accent-fg" : "text-ink-muted"}>{option.icon}</span>
                <span>
                  <span className="block text-sm font-medium text-ink">{option.label}</span>
                  <span className="block text-caption text-ink-muted">{option.detail}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Preview */}
      <section aria-labelledby="export-preview" className="grid gap-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="export-preview" className="text-sm font-semibold text-ink">
            Preview
          </h3>
          <p className="text-ui text-ink-muted" aria-live="polite">
            {loading ? "Loading…" : `${formatNumber(rows.length)} rows · ${columns.length} columns · ${fileName}.${format}`}
          </p>
        </div>

        <div className="overflow-hidden rounded-control border border-line">
          <div className="max-h-64 overflow-auto scrollbar-thin">
            {error ? (
              <p className="p-4 text-ui text-danger">{error}</p>
            ) : columns.length === 0 ? (
              <p className="p-4 text-ui text-ink-muted">Pick at least one column.</p>
            ) : (
              <table className="w-full border-collapse text-ui">
                <thead>
                  <tr className="bg-paper">
                    {columns.map((column) => (
                      <th key={column.id} scope="col" className="sticky top-0 bg-paper px-3 py-2 text-left font-semibold whitespace-nowrap text-ink-muted">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 3 }, (_, i) => (
                        <tr key={i} className="border-t border-line">
                          {columns.map((column) => (
                            <td key={column.id} className="px-3 py-2">
                              <Skeleton className="h-3 w-20" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : rows.slice(0, PREVIEW_ROWS).map((row) => (
                        <tr key={getRowId(row)} className="border-t border-line">
                          {columns.map((column) => (
                            <td key={column.id} className="max-w-56 truncate px-3 py-2 whitespace-nowrap text-ink">
                              {cellText(column, row) || <span className="text-ink-subtle">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                </tbody>
              </table>
            )}
          </div>
          {!loading && !error && rows.length > PREVIEW_ROWS && columns.length > 0 && (
            <p className="border-t border-line bg-paper/60 px-3 py-2 text-caption text-ink-muted">
              …and {formatNumber(rows.length - PREVIEW_ROWS)} more {rows.length - PREVIEW_ROWS === 1 ? "row" : "rows"} in the file
            </p>
          )}
          {!loading && !error && rows.length === 0 && <p className="border-t border-line px-3 py-3 text-ui text-ink-muted">No {noun.many} to export.</p>}
        </div>
      </section>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={exporting}>
          Cancel
        </Button>
        <Button icon={<DownloadIcon />} loading={exporting} disabled={loading || !!error || rows.length === 0 || columns.length === 0} onClick={runExport}>
          Export {format.toUpperCase()}
        </Button>
      </div>
    </div>
  );
}
