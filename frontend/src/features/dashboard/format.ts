import type { BucketUnit } from "./types";

// Buckets are UTC calendar dates, so they're formatted in UTC (never shifted by a time zone).
const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { ...options, timeZone: "UTC" });
const dayMonth = fmt({ day: "numeric", month: "short" });
const weekday = fmt({ weekday: "short" });
const dayMonthYear = fmt({ day: "numeric", month: "short", year: "numeric" });
const shortMonth = fmt({ month: "short" });
const monthYear = fmt({ month: "short", year: "numeric" });
const longMonthYear = fmt({ month: "long", year: "numeric" });

const toDate = (bucket: string) => new Date(`${bucket}T00:00:00Z`);

/** Axis label: `17 Oct` (day / week) · `Mar`, or `Jan 2026` at a year boundary / first label (month). */
export function axisLabel(bucket: string, unit: BucketUnit, first = false): string {
  const date = toDate(bucket);
  if (unit !== "month") return dayMonth.format(date);
  return first || date.getUTCMonth() === 0 ? monthYear.format(date) : shortMonth.format(date);
}

/** Tooltip / table label: `Sat, 17 Oct 2026` · `Week of 17 Aug 2026` · `December 2025`. */
export function bucketLabel(bucket: string, unit: BucketUnit): string {
  const date = toDate(bucket);
  if (unit === "day") return `${weekday.format(date)}, ${dayMonthYear.format(date)}`;
  if (unit === "week") return `Week of ${dayMonthYear.format(date)}`;
  return longMonthYear.format(date);
}

/** Short form for a headline: `13 Nov` · `week of 31 Aug` · `July 2026`. */
export function shortBucketLabel(bucket: string, unit: BucketUnit): string {
  const date = toDate(bucket);
  if (unit === "day") return dayMonth.format(date);
  if (unit === "week") return `week of ${dayMonth.format(date)}`;
  return longMonthYear.format(date);
}

/** "Busiest day / week / month" wording. */
export const UNIT_NOUN: Record<BucketUnit, string> = { day: "day", week: "week", month: "month" };

/**
 * Clean axis ticks from 0: a step of 1, 2 or 5 × 10ⁿ giving 3–5 ticks, the top tick ≥ the max.
 * `niceTicks(27)` → [0, 10, 20, 30]; `niceTicks(3)` → [0, 1, 2, 3].
 */
export function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power;
  const wholeStep = Math.max(1, Math.round(step));
  const top = Math.ceil(max / wholeStep) * wholeStep;
  return Array.from({ length: top / wholeStep + 1 }, (_, i) => i * wholeStep);
}

/** `0.183` → `18%` (shares are for orientation; whole percents are enough). */
export const percent = (part: number, whole: number) => `${whole ? Math.round((part / whole) * 100) : 0}%`;
