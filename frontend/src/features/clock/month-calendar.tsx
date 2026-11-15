"use client";

import { useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

// Weeks start on Sunday, as in Bangladesh (CLDR week data for en-BD).
const WEEKDAYS = [
  ["Su", "Sunday"],
  ["Mo", "Monday"],
  ["Tu", "Tuesday"],
  ["We", "Wednesday"],
  ["Th", "Thursday"],
  ["Fr", "Friday"],
  ["Sa", "Saturday"],
] as const;

const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

/** `2026-11` + n months → `2027-01` (UTC calendar arithmetic, no DST surprises). */
function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** Always 6 weeks (42 days) so the panel keeps the same height from month to month. */
function monthGrid(month: string) {
  const [year, m] = month.split("-").map(Number);
  const lead = new Date(Date.UTC(year, m - 1, 1)).getUTCDay();
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(Date.UTC(year, m - 1, 1 - lead + i));
    return { iso: date.toISOString().slice(0, 10), day: date.getUTCDate(), inMonth: date.getUTCMonth() === m - 1 };
  });
}

/**
 * Read-only month view. `today` is the date in the main clock's time zone (`YYYY-MM-DD`), so it follows
 * the zone the user picked. Days aren't buttons: there's nothing to pick, so it's a plain table.
 */
export function MonthCalendar({ today }: { today: string }) {
  const currentMonth = today.slice(0, 7);
  const [shown, setShown] = useState(currentMonth);
  const cells = monthGrid(shown);
  const weeks = Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  const label = monthLabel.format(new Date(`${shown}-01T00:00:00Z`));

  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        <p className="flex-1 pl-1 text-ui font-semibold text-ink" aria-live="polite">
          {label}
        </p>
        <button
          type="button"
          onClick={() => setShown(currentMonth)}
          disabled={shown === currentMonth}
          className={cn(
            "h-8 rounded-control px-2 text-xs font-medium text-accent-fg transition-colors hover:bg-paper-2 focus-ring pointer-coarse:h-10",
            // Kept in the layout (no shift); hidden and disabled (skipped by focus) on the current month.
            shown === currentMonth && "invisible",
          )}
        >
          Today
        </button>
        <IconButton size="sm" label="Previous month" icon={<ChevronLeftIcon />} onClick={() => setShown((m) => shiftMonth(m, -1))} />
        <IconButton size="sm" label="Next month" icon={<ChevronRightIcon />} onClick={() => setShown((m) => shiftMonth(m, 1))} />
      </div>

      <table className="w-full table-fixed border-collapse text-center text-ui">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {WEEKDAYS.map(([short, full]) => (
              <th key={short} scope="col" abbr={full} className="h-7 text-caption font-medium text-ink-subtle">
                {short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].iso}>
              {week.map((cell) => {
                const isToday = cell.iso === today;
                return (
                  <td key={cell.iso} className="p-0.5" aria-current={isToday ? "date" : undefined}>
                    <span
                      className={cn(
                        "mx-auto flex size-8 items-center justify-center rounded-full tabular-nums",
                        cell.inMonth ? "text-ink" : "text-ink-subtle",
                        isToday && "bg-accent font-semibold text-accent-ink",
                      )}
                    >
                      {cell.day}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
