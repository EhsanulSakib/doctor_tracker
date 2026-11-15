import { Button } from "./button";
import { FilterIcon, XIcon } from "./icons";

export type FilterToken = { key: string; label: string; onRemove: () => void };

/**
 * The active filters as removable tokens (8px corners, not pills) plus "Clear all". Renders nothing
 * when no filter is set. Search isn't a token: it already has its own box.
 */
export function FilterTokens({ tokens, onClearAll }: { tokens: FilterToken[]; onClearAll: () => void }) {
  if (tokens.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
      {tokens.map((token) => (
        <li key={token.key} className="inline-flex h-7 items-center gap-0.5 rounded-control border border-line bg-surface pr-0.5 pl-2 text-[13px] text-ink">
          {token.label}
          <button
            type="button"
            onClick={token.onRemove}
            aria-label={`Remove filter: ${token.label}`}
            className="flex size-6 items-center justify-center rounded-[6px] text-ink-muted transition-colors hover:bg-paper-2 hover:text-ink focus-ring"
          >
            <XIcon size={14} />
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={onClearAll}
          className="h-7 rounded-control px-2 text-[13px] font-medium text-accent-fg transition-colors hover:bg-paper-2 focus-ring"
        >
          Clear all
        </button>
      </li>
    </ul>
  );
}

/** "Filters" button with the number of active filters in a small circle (icon only on phones). */
export function FiltersButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <Button variant="secondary" icon={<FilterIcon />} onClick={onClick} aria-label={count ? `Filters, ${count} active` : "Filters"} className="max-sm:w-11 max-sm:px-0">
      <span className="max-sm:sr-only">Filters</span>
      {count > 0 && (
        <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-ink tabular-nums max-sm:hidden">
          {count}
        </span>
      )}
    </Button>
  );
}
