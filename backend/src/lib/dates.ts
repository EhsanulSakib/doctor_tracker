import { env } from '../config/env.js';

/**
 * Date-only fields (admission date, joined date) are stored as UTC midnight of the calendar date,
 * so `2026-11-16` is always `2026-11-16T00:00:00.000Z` whatever the server's timezone.
 *
 * "Today", however, depends on where the clinic is: at 02:00 in Dhaka (UTC+6) it is already the
 * 16th while UTC is still on the 15th. Using the UTC date would reject today's admissions as
 * "in the future" and leave them off the dashboard for six hours every night.
 */
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: env.APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's calendar date in APP_TIMEZONE, as `YYYY-MM-DD` (en-CA formats dates that way). */
export function todayInAppTimezone(now = new Date()): string {
  return formatter.format(now);
}

/** Today in APP_TIMEZONE as a stored date-only value (UTC midnight). */
export function todayAsDateOnly(now = new Date()): Date {
  return new Date(`${todayInAppTimezone(now)}T00:00:00.000Z`);
}
