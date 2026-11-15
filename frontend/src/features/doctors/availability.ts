import type { BadgeTone } from "@/components/ui/badge";
import { WEEKDAY_LABELS, WEEKDAYS, type Weekday } from "@/lib/constants";
import { APP_TIMEZONE } from "@/lib/utils";
import type { Doctor } from "./types";

/** "17:00" → "5:00 PM". */
export function formatClock(time: string): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "5:00 PM – 9:00 PM", or null when the hours aren't set. */
export function formatHours(start: string | null, end: string | null): string | null {
  return start && end ? `${formatClock(start)} – ${formatClock(end)}` : null;
}

/** "Sat, Mon, Wed" (or "No chamber days"). */
export const formatDays = (days: Weekday[]) => (days.length ? days.map((d) => WEEKDAY_LABELS[d].short).join(", ") : "No chamber days");

const clinicClock = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** The time right now in the clinic, as "HH:MM". */
export const clinicTimeNow = (now: Date) => clinicClock.format(now);

/** The next chamber day after today, e.g. "Mon" (null without chamber days). */
function nextChamberDay(days: Weekday[], today: string): Weekday | null {
  if (!days.length) return null;
  const order = WEEKDAYS.indexOf(weekdayOfIso(today));
  for (let step = 1; step <= 7; step += 1) {
    const day = WEEKDAYS[(order + step) % 7]!;
    if (days.includes(day)) return day;
  }
  return null;
}

const UTC_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export const weekdayOfIso = (iso: string): Weekday => UTC_DAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()]!;

export type AvailabilityKey = "in_chamber" | "present" | "due" | "absent" | "leave" | "off" | "inactive";

export type Availability = {
  key: AvailabilityKey;
  label: string;
  /** One more line: hours, next chamber day. */
  detail: string | null;
  tone: BadgeTone;
  /** Pulsing dot: the doctor is seeing patients right now. */
  live: boolean;
};

/**
 * Where the doctor is today, from their status, today's attendance and their chamber hours (all in clinic
 * time). `now` is null before hydration: the time-dependent "in chamber now" waits for the client.
 */
export function availabilityOf(doctor: Pick<Doctor, "status" | "today" | "chamberDays" | "chamberStart" | "chamberEnd">, now: Date | null): Availability {
  const hours = formatHours(doctor.chamberStart, doctor.chamberEnd);
  const { today } = doctor;

  if (doctor.status === "inactive") return { key: "inactive", label: "Inactive", detail: null, tone: "neutral", live: false };
  if (doctor.status === "on_leave" || today.attendance === "leave") return { key: "leave", label: "On leave", detail: null, tone: "warning", live: false };
  if (today.attendance === "absent") return { key: "absent", label: "Absent today", detail: hours, tone: "danger", live: false };

  if (!today.scheduled && today.attendance !== "present") {
    const next = nextChamberDay(doctor.chamberDays, today.date);
    return { key: "off", label: "Off today", detail: next ? `Next: ${WEEKDAY_LABELS[next].long}` : null, tone: "neutral", live: false };
  }

  const clock = now ? clinicTimeNow(now) : null;
  const inHours = !!(clock && doctor.chamberStart && doctor.chamberEnd && clock >= doctor.chamberStart && clock < doctor.chamberEnd);

  if (today.attendance === "present") {
    return inHours
      ? { key: "in_chamber", label: "In chamber now", detail: hours, tone: "success", live: true }
      : { key: "present", label: "Present", detail: hours, tone: "success", live: false };
  }
  return { key: "due", label: doctor.chamberStart ? `Due at ${formatClock(doctor.chamberStart)}` : "Due today", detail: hours, tone: "info", live: false };
}
