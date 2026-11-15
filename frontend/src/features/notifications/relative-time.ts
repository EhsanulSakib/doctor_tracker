import { APP_TIMEZONE } from "@/lib/utils";
import { formatShortDay, formatTime, zoneDateIso } from "@/features/clock/time";

const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: APP_TIMEZONE });

/**
 * Short, plain "when" for a notification, in Dhaka time:
 * `Just now` · `12 min ago` · `3 h ago` · `Yesterday, 4:30 PM` · `Thu, 12 Nov, 4:30 PM` · `2 Nov`.
 */
export function timeAgo(iso: string, now: Date): string {
  const date = new Date(iso);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const today = zoneDateIso(now, APP_TIMEZONE);
  const day = zoneDateIso(date, APP_TIMEZONE);
  if (day === today) return `${Math.floor(minutes / 60)} h ago`;

  const yesterday = zoneDateIso(new Date(now.getTime() - 86_400_000), APP_TIMEZONE);
  const time = formatTime(date, APP_TIMEZONE);
  if (day === yesterday) return `Yesterday, ${time}`;
  if (minutes < 7 * 24 * 60) return `${formatShortDay(date, APP_TIMEZONE)}, ${time}`;
  return dayMonth.format(date);
}
