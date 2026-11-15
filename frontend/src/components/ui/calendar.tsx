"use client";

import { m } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { addDaysIso, cn } from "@/lib/utils";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";

/** Inclusive calendar dates as `YYYY-MM-DD`. */
export type DateRange = { from?: string; to?: string };

type CommonProps = {
  /** Today in the clinic's time zone (`YYYY-MM-DD`): passed in, so rendering stays pure. */
  today: string;
  min?: string;
  max?: string;
  /** Move keyboard focus to the selected day (or today) when the calendar appears. */
  autoFocus?: boolean;
  className?: string;
};
type CalendarProps =
  | (CommonProps & { mode: "single"; value?: string; onSelect: (date: string) => void })
  | (CommonProps & { mode: "range"; value: DateRange; onSelect: (range: DateRange) => void });

type View = "days" | "months" | "years";

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { ...options, timeZone: "UTC" });
const monthYearFmt = fmt({ month: "long", year: "numeric" });
const longDayFmt = fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortMonthFmt = fmt({ month: "short" });
const WEEKDAYS = [
  ["Su", "Sunday"],
  ["Mo", "Monday"],
  ["Tu", "Tuesday"],
  ["We", "Wednesday"],
  ["Th", "Thursday"],
  ["Fr", "Friday"],
  ["Sa", "Saturday"],
] as const;

/** `2026-11` + n months → `2027-01`. */
const addMonths = (month: string, n: number) => {
  const [y, mo] = month.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1 + n, 1)).toISOString().slice(0, 7);
};
/** Same day-of-month n months away, clamped to that month's length (31 Jan + 1 month → 28/29 Feb). */
const addMonthsToDate = (date: string, n: number) => {
  const target = addMonths(date.slice(0, 7), n);
  const [y, mo] = target.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return `${target}-${String(Math.min(Number(date.slice(8)), lastDay)).padStart(2, "0")}`;
};
/** 42 days (6 full weeks, Sunday first) so the grid never changes height between months. */
function monthGrid(month: string) {
  const [y, mo] = month.split("-").map(Number);
  const lead = new Date(Date.UTC(y, mo - 1, 1)).getUTCDay();
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(Date.UTC(y, mo - 1, 1 - lead + i));
    return { iso: date.toISOString().slice(0, 10), day: date.getUTCDate(), inMonth: date.getUTCMonth() === mo - 1 };
  });
}
/** The same day of the month in another month, clamped to that month's length. */
const withMonth = (date: string, month: string) => addMonthsToDate(`${month}-01`, 0).slice(0, 8) + String(Math.min(Number(date.slice(8)), new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate())).padStart(2, "0");
const clamp = (date: string, min?: string, max?: string) => (min && date < min ? min : max && date > max ? max : date);

/**
 * Hand-built calendar (WAI-ARIA date grid): days as a grid of buttons with one tab stop, arrows move a
 * day / week, PageUp / PageDown a month (Shift: a year), Home / End the week, Enter picks. The title
 * switches to a month view and then a year view for big jumps (dates of joining go back decades).
 * Range mode: first click sets the start, the second the end (hover previews it). Months slide in from
 * the direction you moved.
 */
export function Calendar(props: CalendarProps) {
  const { today, min, max, autoFocus, className } = props;
  const anchor = clamp((props.mode === "single" ? props.value : (props.value.to ?? props.value.from)) || today, min, max);
  const [month, setMonth] = useState(anchor.slice(0, 7));
  const [focused, setFocused] = useState(anchor);
  const [view, setView] = useState<View>("days");
  const [direction, setDirection] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(autoFocus ?? false);

  // Keyboard navigation (or autoFocus) moves real focus to the roving day.
  useEffect(() => {
    if (!moveFocus.current || view !== "days") return;
    moveFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus({ preventScroll: true });
  }, [focused, month, view]);

  const showMonth = (next: string) => {
    setDirection(next > month ? 1 : next < month ? -1 : 0);
    setMonth(next);
  };
  const focusDate = (date: string) => {
    const next = clamp(date, min, max);
    moveFocus.current = true;
    setFocused(next);
    if (next.slice(0, 7) !== month) showMonth(next.slice(0, 7));
  };

  const disabled = (date: string) => (!!min && date < min) || (!!max && date > max);

  const select = (date: string) => {
    if (disabled(date)) return;
    setFocused(date);
    if (props.mode === "single") return props.onSelect(date);
    const { from, to } = props.value;
    if (!from || to) props.onSelect({ from: date, to: undefined });
    else props.onSelect(date < from ? { from: date, to: from } : { from, to: date });
  };

  const onDayKey = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const step: Record<string, () => string> = {
      ArrowLeft: () => addDaysIso(date, -1),
      ArrowRight: () => addDaysIso(date, 1),
      ArrowUp: () => addDaysIso(date, -7),
      ArrowDown: () => addDaysIso(date, 7),
      Home: () => addDaysIso(date, -utc(date).getUTCDay()),
      End: () => addDaysIso(date, 6 - utc(date).getUTCDay()),
      PageUp: () => addMonthsToDate(date, event.shiftKey ? -12 : -1),
      PageDown: () => addMonthsToDate(date, event.shiftKey ? 12 : 1),
    };
    const next = step[event.key];
    if (!next) return;
    event.preventDefault();
    focusDate(next());
  };

  // Range shading: the chosen range, or a preview while the end is being picked.
  const range = props.mode === "range" ? props.value : undefined;
  const rangeEnd = range?.from && !range.to && hovered ? (hovered < range.from ? range.from : hovered) : range?.to;
  const rangeStart = range?.from && !range.to && hovered && hovered < range.from ? hovered : range?.from;
  const isSelected = (date: string) => (props.mode === "single" ? props.value === date : date === range?.from || date === range?.to);
  const inRange = (date: string) => !!rangeStart && !!rangeEnd && date >= rangeStart && date <= rangeEnd;

  const year = Number(month.slice(0, 4));
  const decadeStart = Math.floor(year / 12) * 12;
  const title =
    view === "days" ? monthYearFmt.format(utc(`${month}-01`)) : view === "months" ? String(year) : `${decadeStart} – ${decadeStart + 11}`;
  const step = (delta: number) => {
    if (view === "days") showMonth(addMonths(month, delta));
    else if (view === "months") showMonth(addMonths(month, delta * 12));
    else showMonth(addMonths(month, delta * 144));
  };
  const canStep = (delta: number) => {
    const span = view === "days" ? 1 : view === "months" ? 12 : 144;
    const target = addMonths(month, delta * span);
    if (delta < 0 && min) return target >= addMonths(min.slice(0, 7), -(span - 1));
    if (delta > 0 && max) return target <= addMonths(max.slice(0, 7), span - 1);
    return true;
  };

  return (
    <div className={cn("w-70 select-none", className)}>
      <div className="mb-2 flex items-center gap-1">
        <NavButton label={view === "days" ? "Previous month" : view === "months" ? "Previous year" : "Previous years"} disabled={!canStep(-1)} onClick={() => step(-1)}>
          <ChevronLeftIcon />
        </NavButton>
        <button
          type="button"
          onClick={() => setView(view === "days" ? "months" : view === "months" ? "years" : "days")}
          aria-label={view === "days" ? `${title}, choose a month` : view === "months" ? `${title}, choose a year` : "Back to days"}
          className="flex h-8 flex-1 items-center justify-center gap-1 rounded-control text-ui font-semibold text-ink transition-colors hover:bg-paper-2 focus-ring"
        >
          <span aria-live="polite">{title}</span>
          <ChevronDownIcon size={14} className={cn("text-ink-subtle transition-transform duration-200", view !== "days" && "rotate-180")} />
        </button>
        <NavButton label={view === "days" ? "Next month" : view === "months" ? "Next year" : "Next years"} disabled={!canStep(1)} onClick={() => step(1)}>
          <ChevronRightIcon />
        </NavButton>
      </div>

      <div ref={gridRef} className="relative overflow-hidden">
        <m.div
          key={`${view}-${view === "days" ? month : view === "months" ? year : decadeStart}`}
          initial={direction ? { x: direction * 28, opacity: 0 } : { opacity: 0, scale: 0.98 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 40, mass: 0.7 }}
        >
          {view === "days" && (
            <table role="grid" aria-label={title} className="w-full table-fixed border-collapse">
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
                {Array.from({ length: 6 }, (_, w) => monthGrid(month).slice(w * 7, w * 7 + 7)).map((week) => (
                  <tr key={week[0].iso}>
                    {week.map((cell) => {
                      const selected = isSelected(cell.iso);
                      const banded = inRange(cell.iso);
                      const off = disabled(cell.iso);
                      return (
                        <td key={cell.iso} role="gridcell" aria-selected={selected || undefined} className="p-0 py-0.5">
                          {/* The range band runs behind the circles, rounded at its two ends. */}
                          <div
                            className={cn(
                              "flex justify-center",
                              banded && "bg-accent-soft",
                              banded && cell.iso === rangeStart && "rounded-l-full",
                              banded && cell.iso === rangeEnd && "rounded-r-full",
                            )}
                          >
                            <button
                              type="button"
                              data-date={cell.iso}
                              tabIndex={cell.iso === focused ? 0 : -1}
                              disabled={off}
                              aria-label={longDayFmt.format(utc(cell.iso))}
                              aria-current={cell.iso === today ? "date" : undefined}
                              aria-pressed={selected}
                              onClick={() => select(cell.iso)}
                              onKeyDown={(event) => onDayKey(event, cell.iso)}
                              onFocus={() => setFocused(cell.iso)}
                              onMouseEnter={() => setHovered(cell.iso)}
                              onMouseLeave={() => setHovered(null)}
                              className={cn(
                                "relative flex size-9 items-center justify-center rounded-full text-ui tabular-nums transition-colors focus-ring",
                                cell.inMonth ? "text-ink" : "text-ink-subtle",
                                !selected && !off && "hover:bg-paper-2",
                                cell.iso === today && !selected && "font-semibold text-accent-fg",
                                selected && "bg-accent font-semibold text-accent-ink shadow-card",
                                off && "cursor-not-allowed opacity-35",
                              )}
                            >
                              {cell.day}
                              {cell.iso === today && !selected && <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-accent-fg" />}
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view === "months" && (
            <div className="grid grid-cols-3 gap-1.5 py-1">
              {Array.from({ length: 12 }, (_, i) => {
                const value = `${year}-${String(i + 1).padStart(2, "0")}`;
                const off = (!!min && value < min.slice(0, 7)) || (!!max && value > max.slice(0, 7));
                const current = value === month;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={off}
                    onClick={() => {
                      showMonth(value);
                      setFocused(clamp(withMonth(focused, value), min, max));
                      setView("days");
                    }}
                    className={cn(
                      "h-10 rounded-full text-ui transition-colors focus-ring",
                      current ? "bg-accent font-semibold text-accent-ink" : "text-ink hover:bg-paper-2",
                      off && "cursor-not-allowed opacity-35",
                    )}
                  >
                    {shortMonthFmt.format(utc(`${value}-01`))}
                  </button>
                );
              })}
            </div>
          )}

          {view === "years" && (
            <div className="grid grid-cols-3 gap-1.5 py-1">
              {Array.from({ length: 12 }, (_, i) => {
                const value = decadeStart + i;
                const off = (!!min && value < Number(min.slice(0, 4))) || (!!max && value > Number(max.slice(0, 4)));
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={off}
                    onClick={() => {
                      showMonth(`${value}-${month.slice(5, 7)}`);
                      setView("months");
                    }}
                    className={cn(
                      "h-10 rounded-full text-ui tabular-nums transition-colors focus-ring",
                      value === year ? "bg-accent font-semibold text-accent-ink" : "text-ink hover:bg-paper-2",
                      off && "cursor-not-allowed opacity-35",
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          )}
        </m.div>
      </div>
    </div>
  );
}

function NavButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tooltip={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-2 hover:text-ink focus-ring disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}
