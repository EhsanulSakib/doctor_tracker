"use client";

import { useState } from "react";
import { addDaysIso, cn, formatDate, formatShortDate, todayIso } from "@/lib/utils";
import { Button } from "./button";
import { Field } from "./field";
import { CalendarIcon } from "./icons";
import { fieldStyles, Input } from "./input";
import { Popover } from "./popover";

/** Inclusive calendar dates as `YYYY-MM-DD` (what the API's `…From` / `…To` filters take). */
export type DateRange = { from?: string; to?: string };

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

/**
 * Date-range filter: one-click presets, or two native date inputs (keyboard and screen-reader friendly,
 * and the phone's own date picker on mobile). Edits stay a draft until "Apply".
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
  const invalid = Boolean(draft.from && draft.to && draft.from > draft.to);

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      label={label}
      align={align}
      className="w-[min(23rem,calc(100vw-16px))]"
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
          <CalendarIcon className="shrink-0 text-ink-subtle" />
          <span className={cn("truncate", !text && "text-ink-subtle")}>{text ?? placeholder}</span>
        </button>
      )}
    >
      {({ close }) => (
        <div className="grid gap-3">
          <p className="text-label font-medium uppercase text-ink-muted">{label}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {presetsFor(today).map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onChange(preset.range);
                  close();
                }}
                className="rounded-control border border-line px-2.5 py-1.5 text-left text-[13px] text-ink transition-colors hover:border-line-strong hover:bg-paper-2 focus-ring pointer-coarse:py-2.5"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
            <Field label="From">
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={draft.from ?? ""}
                  max={draft.to || today}
                  onChange={(event) => setDraft((d) => ({ ...d, from: event.target.value || undefined }))}
                />
              )}
            </Field>
            <Field label="To" error={invalid ? "Must be on or after the start" : undefined}>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={draft.to ?? ""}
                  min={draft.from}
                  max={today}
                  onChange={(event) => setDraft((d) => ({ ...d, to: event.target.value || undefined }))}
                />
              )}
            </Field>
          </div>

          <div className="flex items-center justify-between gap-2">
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
              disabled={invalid}
              onClick={() => {
                onChange(draft);
                close();
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </Popover>
  );
}
