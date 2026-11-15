"use client";

import { useState } from "react";
import { addDaysIso, cn, formatDate, formatShortDate, todayIso } from "@/lib/utils";
import { Button } from "./button";
import { Calendar, type DateRange } from "./calendar";
import { CalendarIcon } from "./icons";
import { fieldStyles } from "./input";
import { Popover } from "./popover";

/** Inclusive calendar dates as `YYYY-MM-DD` (what the API's `…From` / `…To` filters take). */
export type { DateRange };

type DateRangeFieldProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Accessible name, e.g. "Admission date". */
  label: string;
  placeholder?: string;
  align?: "start" | "end";
  className?: string;
};

/** Presets count back from today in Dhaka, so "Last 30 days" matches the dashboard's 30d range. */
function presetsFor(today: string): { label: string; range: DateRange }[] {
  return [
    { label: "Last 7 days", range: { from: addDaysIso(today, -6), to: today } },
    { label: "Last 30 days", range: { from: addDaysIso(today, -29), to: today } },
    { label: "Last 90 days", range: { from: addDaysIso(today, -89), to: today } },
    { label: "Last 12 months", range: { from: addDaysIso(today, -364), to: today } },
    { label: "This year", range: { from: `${today.slice(0, 4)}-01-01`, to: today } },
    { label: "Last year", range: { from: `${Number(today.slice(0, 4)) - 1}-01-01`, to: `${Number(today.slice(0, 4)) - 1}-12-31` } },
  ];
}

/** "1 Jan – 31 Mar 2026", "From 1 Jan 2026", "Until 31 Mar 2026". */
export function formatRange({ from, to }: DateRange): string | null {
  if (from && to) {
    return from.slice(0, 4) === to.slice(0, 4) ? `${formatShortDate(from)} – ${formatDate(to)}` : `${formatDate(from)} – ${formatDate(to)}`;
  }
  if (from) return `From ${formatDate(from)}`;
  if (to) return `Until ${formatDate(to)}`;
  return null;
}

const sameRange = (a: DateRange, b: DateRange) => a.from === b.from && a.to === b.to;

/**
 * Date-range filter: one-click presets beside the app's own range calendar (click the first day, then
 * the last; the band previews it as you move). Edits stay a draft until "Apply". Nothing in here opens a
 * second floating panel, so it works inside dialogs and bottom sheets.
 */
export function DateRangeField({ value, onChange, label, placeholder = "Any date", align = "start", className }: DateRangeFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  // Set when the panel opens (the panel only renders while open), so nothing impure runs during render.
  const [today, setToday] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(value);
      setToday(todayIso());
    }
    setOpen(next);
  };

  const text = formatRange(value);
  const draftText = formatRange(draft);

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      label={label}
      align={align}
      className="w-auto p-0"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={`${label}: ${text ?? placeholder}`}
          className={cn(
            fieldStyles,
            // Full width in a stacked phone layout; sized to its text in a desktop filter bar.
            "flex h-9 items-center gap-2 px-3 text-left sm:w-auto sm:min-w-60 pointer-coarse:h-11",
            open && "border-accent ring-3 ring-accent/20",
            className,
          )}
        >
          <CalendarIcon className={cn("shrink-0 transition-colors", open ? "text-accent-fg" : "text-ink-subtle")} />
          <span className={cn("truncate", !text && "text-ink-subtle")}>{text ?? placeholder}</span>
        </button>
      )}
    >
      {({ close }) => (
        <div className="flex max-h-(--panel-max-height) flex-col overflow-y-auto scrollbar-thin sm:flex-row">
          <div className="flex flex-col gap-1 border-b border-line p-2 sm:w-40 sm:border-r sm:border-b-0">
            <p className="px-2 pt-1 pb-1.5 text-label font-medium text-ink-muted uppercase">{label}</p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-1">
              {presetsFor(today).map((preset) => {
                const current = sameRange(preset.range, draft);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      onChange(preset.range);
                      close();
                    }}
                    className={cn(
                      "h-8 rounded-full px-3 text-left text-ui transition-colors focus-ring pointer-coarse:h-10",
                      current ? "bg-accent-soft font-medium text-accent-fg" : "text-ink hover:bg-paper-2",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3">
            <Calendar mode="range" today={today} value={draft} max={today} onSelect={setDraft} />
            <p className="mt-2 h-5 text-center text-xs leading-5 text-ink-muted tabular-nums" aria-live="polite">
              {draft.from && !draft.to ? "Now pick the last day" : (draftText ?? "Pick the first day")}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange({});
                  close();
                }}
              >
                Clear
              </Button>
              <Button
                size="sm"
                disabled={!draft.from}
                onClick={() => {
                  // A single picked day is a one-day range.
                  onChange({ from: draft.from, to: draft.to ?? draft.from });
                  close();
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </Popover>
  );
}
