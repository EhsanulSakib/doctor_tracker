import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge must know the design tokens, or `text-label` and `text-ink` would both be read as
// colors (and `rounded-control` as unknown), so a className override wouldn't replace the default.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        "paper", "paper-2", "surface", "ink", "ink-muted", "ink-subtle", "line", "line-strong",
        "accent", "accent-hover", "accent-soft", "accent-ink", "accent-fg", "accent-2", "danger", "danger-hover", "danger-soft",
        "danger-ink", "warning", "warning-soft", "success", "success-soft", "info", "info-soft", "overlay",
      ],
      text: ["label", "title"],
      radius: ["control", "panel"],
      shadow: ["card", "overlay"],
      ease: ["clinical"],
    },
  },
});

/** Joins class names; later Tailwind classes win over conflicting earlier ones (`cn("px-3", "px-4")` → `px-4`). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Bangladesh formatting ──────────────────────────────────────────────────────────────────

/** The clinic's timezone: decides what "today" is (same default as the API's APP_TIMEZONE). */
export const APP_TIMEZONE = "Asia/Dhaka";

/**
 * Bangladesh writes English dates day-first (15 Nov 2026), uses a 12-hour clock and groups digits
 * in lakhs (12,34,567). ICU's `en-BD` falls back to US conventions, while `en-IN` shares exactly these
 * South Asian conventions, so it's the formatting locale.
 */
const FORMAT_LOCALE = "en-IN";

// Date-only values (admission date, joined date) are stored as UTC midnight: format them in UTC so
// they never shift by a day. Timestamps (createdAt) are shown in Dhaka time.
const dateFormat = new Intl.DateTimeFormat(FORMAT_LOCALE, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDateFormat = new Intl.DateTimeFormat(FORMAT_LOCALE, { day: "numeric", month: "short", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat(FORMAT_LOCALE, { dateStyle: "medium", timeStyle: "short", timeZone: APP_TIMEZONE });
const numberFormat = new Intl.NumberFormat(FORMAT_LOCALE);
const isoDateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** `2026-11-15` or an ISO timestamp of a date-only value → `15 Nov 2026`. */
export const formatDate = (value: string | Date) => dateFormat.format(new Date(value));
/** `15 Nov` (no year). */
export const formatShortDate = (value: string | Date) => shortDateFormat.format(new Date(value));
/** A timestamp in Dhaka time → `16 Nov 2026, 2:05 am`. */
export const formatDateTime = (value: string | Date) => dateTimeFormat.format(new Date(value));
/** `1234567` → `12,34,567`. */
export const formatNumber = (value: number) => numberFormat.format(value);

/** Today's calendar date in Dhaka as `YYYY-MM-DD` (en-CA formats dates that way). */
export const todayIso = (now = new Date()) => isoDateFormat.format(now);

/** Adds days to a `YYYY-MM-DD` date (calendar arithmetic in UTC, so no DST/offset surprises). */
export function addDaysIso(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

// ─── Query strings ──────────────────────────────────────────────────────────────────────────

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/** `{ page: 2, search: "", status: undefined }` → `?page=2` (empty values are dropped). */
export function toQueryString(params?: QueryParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
