import Link from "next/link";
import { cn, formatNumber } from "@/lib/utils";
import { percent } from "../format";

export type RankedItem = { key: string; label: string; value: number; href?: string; detail?: string };

/**
 * Ranked horizontal bars, one hue (the parts are compared with each other, so they share a baseline):
 * 10px bars with a 4px rounded data end, square at the baseline, value at the tip. Rows share the card's
 * height evenly (18px at least, then the list scrolls). Hover / focus shows the share of the whole.
 */
export function RankedBars({
  items,
  total,
  unit,
  labelWidth = "8.5rem",
  delay = 0,
}: {
  items: RankedItem[];
  total: number;
  unit: string;
  labelWidth?: string;
  /** Entrance: bars grow one after another from this delay (ms). */
  delay?: number;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="flex h-full min-h-0 flex-col overflow-y-auto scrollbar-thin">
      {items.map((item, index) => {
        const share = percent(item.value, total);
        const at = delay + index * 40;
        const name = item.href ? (
          <Link href={item.href} className="block truncate rounded-sm text-ink transition-colors after:absolute after:inset-0 hover:text-accent-fg focus-ring">
            {item.label}
          </Link>
        ) : (
          <span className="block truncate text-ink">{item.label}</span>
        );
        return (
          <li
            key={item.key}
            className="group relative grid min-h-6 flex-1 items-center max-lg:pointer-coarse:min-h-10 lg:min-h-4.5 gap-3 rounded-mark px-1 text-ui transition-colors hover:bg-paper-2"
            style={{ gridTemplateColumns: `minmax(0, ${labelWidth}) minmax(0, 1fr)` }}
          >
            {name}
            <div className="flex min-w-0 items-center gap-2">
              {/* The bar's width leaves room for the value at its tip (2.75rem). */}
              <span
                aria-hidden
                className={cn(
                  "block h-2.5 shrink-0 origin-left rounded-r-mark bg-chart-accent transition-[width] duration-300 ease-clinical motion-safe:animate-grow-x",
                  item.value === 0 && "invisible",
                )}
                style={{ width: `calc((100% - 2.75rem) * ${item.value / max})`, animationDelay: `${at}ms` }}
              />
              <span className="font-medium text-ink tabular-nums motion-safe:animate-fade-in" style={{ animationDelay: `${at + 350}ms` }}>
                {formatNumber(item.value)}
              </span>
              <span className="sr-only">
                {" "}
                {unit}, {share}
              </span>
            </div>
            {/* Hover / focus readout: the share of the whole (and any detail), above the row. */}
            <span
              aria-hidden
              className="pointer-events-none absolute right-1 bottom-full z-10 mb-1 rounded-control border border-line bg-surface px-2 py-1 text-xs whitespace-nowrap text-ink-muted opacity-0 shadow-overlay transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
            >
              <span className="font-semibold text-ink tabular-nums">{share}</span> of {unit}
              {item.detail && ` · ${item.detail}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
