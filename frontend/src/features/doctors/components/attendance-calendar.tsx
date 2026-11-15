"use client";

import { m } from "motion/react";
import { useState, type CSSProperties } from "react";
import { ATTENDANCE_LABELS, WEEKDAYS, type AttendanceStatus } from "@/lib/constants";
import { cn, formatNumber } from "@/lib/utils";
import { weekdayOfIso } from "../availability";
import type { AttendanceHistory, Doctor } from "../types";

const DAY_MS = 86_400_000;
const RANGES = [7, 30, 60, 90] as const;
type Range = (typeof RANGES)[number];
const LOG_PREVIEW = 8;

type DayKind = AttendanceStatus | "unmarked" | "today" | "off" | "pad";

const CELL: Record<DayKind, string> = {
  present: "bg-success",
  absent: "bg-danger",
  leave: "bg-warning",
  unmarked: "bg-line-strong/70",
  today: "bg-line-strong/70",
  off: "bg-paper-2",
  pad: "bg-transparent",
};
const TEXT: Record<DayKind, string> = {
  present: "text-success",
  absent: "text-danger",
  leave: "text-warning",
  unmarked: "text-ink-subtle",
  today: "text-ink-subtle",
  off: "text-ink-subtle",
  pad: "",
};
const LABEL = (kind: DayKind) => (kind === "off" ? "No chamber" : kind === "unmarked" || kind === "today" ? "Not marked" : kind === "pad" ? "" : ATTENDANCE_LABELS[kind]);

const LEGEND: DayKind[] = ["present", "absent", "leave", "unmarked", "off"];

const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const toTime = (day: string) => new Date(`${day}T00:00:00Z`).getTime();
const monthShort = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const fullDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const weekdayShort = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });
const dayOfMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * A doctor's attendance for the last 7, 30, 60 or 90 days: totals, attendance rate and current streak;
 * a week strip (7 days) or a GitHub-style calendar (one column per week, Saturday on top); and a daily
 * log of the chamber days, newest first.
 */
export function AttendancePanel({ doctor, attendance }: { doctor: Doctor; attendance: AttendanceHistory }) {
  const [range, setRange] = useState<Range>(30);
  const byDate = new Map(attendance.records.map((r) => [r.date, r.status]));
  const to = toTime(attendance.to);
  const from = to - (range - 1) * DAY_MS;

  const kindOf = (time: number): DayKind => {
    if (time < from || time > to) return "pad";
    const day = iso(time);
    const status = byDate.get(day);
    if (status) return status;
    if (!doctor.chamberDays.includes(weekdayOfIso(day))) return "off";
    return time === to ? "today" : "unmarked";
  };

  const days = Array.from({ length: range }, (_, i) => from + i * DAY_MS);
  const kinds = days.map(kindOf);
  const present = kinds.filter((k) => k === "present").length;
  const absent = kinds.filter((k) => k === "absent").length;
  const leave = kinds.filter((k) => k === "leave").length;
  const marked = present + absent + leave;
  const rate = marked ? Math.round((present / marked) * 100) : null;

  // Present days in a row, newest first (days off, and today while unmarked, don't break it).
  let streak = 0;
  for (let i = kinds.length - 1; i >= 0; i -= 1) {
    const kind = kinds[i]!;
    if (kind === "off" || kind === "today") continue;
    if (kind !== "present") break;
    streak += 1;
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Period" className="inline-flex h-9 items-center gap-0.5 rounded-control border border-line bg-surface p-0.5 pointer-coarse:h-11">
          {RANGES.map((option) => {
            const selected = option === range;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRange(option)}
                className={cn(
                  "relative h-full cursor-pointer rounded-tag px-3 text-ui font-medium transition-colors focus-ring",
                  selected ? "text-accent-ink" : "text-ink-muted hover:bg-paper-2 hover:text-ink",
                )}
              >
                {selected && <m.span layoutId="attendance-range" className="absolute inset-0 rounded-tag bg-accent" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                <span className="relative">{option} days</span>
              </button>
            );
          })}
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-ink-muted" aria-hidden>
          {LEGEND.map((kind) => (
            <li key={kind} className="flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-[3px]", CELL[kind])} />
              {LABEL(kind)}
            </li>
          ))}
        </ul>
      </div>

      <dl className="grid grid-cols-3 gap-y-3 sm:grid-cols-5 sm:divide-x sm:divide-line">
        <Stat label="Present" value={formatNumber(present)} className="text-success" />
        <Stat label="Absent" value={formatNumber(absent)} className="text-danger" />
        <Stat label="Leave" value={formatNumber(leave)} className="text-warning" />
        <Stat label="Attendance" value={rate === null ? "—" : `${rate}%`} />
        <Stat label="Streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} />
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0" key={range}>
          {range === 7 ? (
            <WeekStrip days={days} kindOf={kindOf} today={to} />
          ) : (
            <Heatmap from={from} to={to} kindOf={kindOf} name={doctor.name} present={present} absent={absent} leave={leave} />
          )}
        </div>
        <DailyLog key={range} days={days} kinds={kinds} />
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="px-0 sm:px-4 sm:first:pl-0">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className={cn("mt-0.5 text-xl leading-7 font-semibold text-ink tabular-nums", className)}>{value}</dd>
    </div>
  );
}

/** Seven tiles, one per day: weekday, date and the status in words. */
function WeekStrip({ days, kindOf, today }: { days: number[]; kindOf: (t: number) => DayKind; today: number }) {
  return (
    <ol className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Last 7 days">
      {days.map((time, i) => {
        const kind = kindOf(time);
        return (
          <m.li
            key={time}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
            className={cn("overflow-hidden rounded-control border border-line bg-surface text-center", time === today && "ring-2 ring-accent/60")}
          >
            <div className={cn("h-1.5", CELL[kind])} />
            <div className="px-1 py-2.5">
              <p className="text-caption text-ink-muted">{weekdayShort.format(new Date(time))}</p>
              <p className="mt-0.5 text-sm font-semibold text-ink tabular-nums">{dayOfMonth.format(new Date(time))}</p>
              <p className={cn("mt-1 truncate text-caption font-semibold", TEXT[kind])}>{LABEL(kind)}</p>
            </div>
          </m.li>
        );
      })}
    </ol>
  );
}

/** GitHub-style: one column per week (Saturday on top), one square per day; month names over the weeks. */
function Heatmap({
  from,
  to,
  kindOf,
  name,
  present,
  absent,
  leave,
}: {
  from: number;
  to: number;
  kindOf: (t: number) => DayKind;
  name: string;
  present: number;
  absent: number;
  leave: number;
}) {
  const start = from - WEEKDAYS.indexOf(weekdayOfIso(iso(from))) * DAY_MS;
  const end = to + (6 - WEEKDAYS.indexOf(weekdayOfIso(iso(to)))) * DAY_MS;
  const weeks = Math.round((end - start) / DAY_MS + 1) / 7;
  const columns = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => start + (w * 7 + d) * DAY_MS));
  const inRange = (t: number) => t >= from && t <= to;
  const monthLabels = columns.map((week, w) => {
    const first = week.find(inRange);
    if (first === undefined) return null;
    const previous = w > 0 ? columns[w - 1]!.find(inRange) : undefined;
    return previous === undefined || new Date(previous).getUTCMonth() !== new Date(first).getUTCMonth() ? monthShort.format(new Date(first)) : null;
  });
  // Squares grow with fewer weeks (up to 2.5rem) and shrink to fit small screens.
  const grid: CSSProperties = { gridTemplateColumns: `repeat(${weeks}, minmax(0, 2.5rem))` };

  return (
    <div className="flex gap-2">
      <div aria-hidden className="mt-5 grid shrink-0 grid-rows-7 gap-1 text-[10px] leading-none text-ink-subtle">
        {WEEKDAYS.map((day, i) => (
          <span key={day} className="flex items-center">
            {i % 2 === 0 ? day[0]!.toUpperCase() + day.slice(1) : ""}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div aria-hidden className="mb-1 grid h-4 gap-1 text-[10px] leading-4 text-ink-subtle" style={grid}>
          {monthLabels.map((label, w) => (
            <span key={w} className="overflow-visible whitespace-nowrap">
              {label}
            </span>
          ))}
        </div>
        <div role="img" aria-label={`Attendance of ${name}: ${present} present, ${absent} absent, ${leave} on leave`} className="grid gap-1" style={grid}>
          {columns.map((week, w) => (
            <div key={w} className="grid grid-rows-7 gap-1">
              {week.map((time) => {
                const kind = kindOf(time);
                return (
                  <m.span
                    key={time}
                    data-tooltip={kind === "pad" ? undefined : `${fullDay.format(new Date(time))}: ${LABEL(kind)}`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18, delay: 0.05 + w * 0.03 }}
                    className={cn("aspect-square w-full rounded-[4px] transition-[filter] hover:brightness-125", CELL[kind], time === to && "ring-2 ring-accent ring-offset-1 ring-offset-surface")}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The chamber days of the period, newest first: the first few, then the rest on demand. */
function DailyLog({ days, kinds }: { days: number[]; kinds: DayKind[] }) {
  const [expanded, setExpanded] = useState(false);
  const entries = days
    .map((time, i) => ({ time, kind: kinds[i]! }))
    .filter((e) => e.kind !== "off" && e.kind !== "pad")
    .reverse();
  const shown = expanded ? entries : entries.slice(0, LOG_PREVIEW);

  return (
    <section aria-label="Daily log" className="rounded-control border border-line">
      <h3 className="border-b border-line px-3 py-2 text-label font-semibold text-ink-subtle uppercase">Daily log</h3>
      {entries.length === 0 ? (
        <p className="px-3 py-4 text-ui text-ink-muted">No chamber days in this period.</p>
      ) : (
        <ol className="divide-y divide-line">
          {shown.map(({ time, kind }) => (
            <li key={time} className="flex items-center justify-between gap-3 px-3 py-2 text-ui">
              <span className="text-ink tabular-nums">{fullDay.format(new Date(time))}</span>
              <span className={cn("font-semibold", TEXT[kind])}>{LABEL(kind)}</span>
            </li>
          ))}
        </ol>
      )}
      {entries.length > LOG_PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full cursor-pointer border-t border-line px-3 py-2 text-ui font-medium text-accent-fg hover:bg-paper-2 focus-ring"
        >
          {expanded ? "Show less" : `Show all ${entries.length} days`}
        </button>
      )}
    </section>
  );
}
