import { APP_TIMEZONE } from "@/lib/utils";

/**
 * Time-zone helpers for the topbar clock. Everything is computed with Intl (no date library):
 * IANA zone ids such as "Asia/Dhaka", formatted the way Bangladesh writes them (en-IN conventions,
 * see lib/utils: 12-hour clock, day before month).
 */

export const DEFAULT_ZONE = APP_TIMEZONE;
export const MAX_ZONES = 6;

const LOCALE = "en-IN";

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Intl formatters are expensive to build and the clock re-renders every second: cache them. */
function formatter(locale: string, zone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${zone}|${JSON.stringify(options)}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, { ...options, timeZone: zone });
    formatters.set(key, cached);
  }
  return cached;
}

const upperPeriod = (text: string) => text.replace(/am|pm/i, (period) => period.toUpperCase());

/** `10:42 AM`, or `10:42:15 AM` with seconds. */
export function formatTime(date: Date, zone: string, withSeconds = false): string {
  const options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true };
  if (withSeconds) options.second = "2-digit";
  return upperPeriod(formatter(LOCALE, zone, options).format(date));
}

/** `Sun, 15 Nov`. */
export const formatShortDay = (date: Date, zone: string) =>
  formatter(LOCALE, zone, { weekday: "short", day: "numeric", month: "short" }).format(date);

/** `Sunday, 15 November 2026`. */
export const formatLongDate = (date: Date, zone: string) =>
  formatter(LOCALE, zone, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);

/** The calendar date in a zone as `YYYY-MM-DD` (en-CA writes dates that way). */
export const zoneDateIso = (date: Date, zone: string) =>
  formatter("en-CA", zone, { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

/** Offset from UTC in minutes at that moment (360 for Dhaka, 330 for Kolkata, −300 for New York in winter). */
export function offsetMinutes(date: Date, zone: string): number {
  const name = formatter("en-US", zone, { timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = name ? /GMT([+\-−])(\d{1,2}):?(\d{2})?/.exec(name) : null;
  if (!match) return 0; // "GMT" = UTC
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "+" ? minutes : -minutes;
}

const hoursAndMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

/** `GMT+6`, `GMT+5:30`, `GMT−5`, `GMT`. */
export function offsetLabel(minutes: number): string {
  if (minutes === 0) return "GMT";
  const abs = Math.abs(minutes);
  const m = abs % 60;
  return `GMT${minutes > 0 ? "+" : "−"}${Math.floor(abs / 60)}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

/** Another zone compared with the main one: `6h behind`, `5h 30m ahead`, `Same time`. */
export function relativeOffset(diffMinutes: number): string {
  if (diffMinutes === 0) return "Same time";
  return `${hoursAndMinutes(Math.abs(diffMinutes))} ${diffMinutes > 0 ? "ahead" : "behind"}`;
}

/** `Tomorrow` / `Yesterday` when the zone's date differs from the main zone's, otherwise null. */
export function dayRelation(date: Date, zone: string, mainZone: string): string | null {
  const here = zoneDateIso(date, zone);
  const main = zoneDateIso(date, mainZone);
  if (here === main) return null;
  return here > main ? "Tomorrow" : "Yesterday";
}

// ICU still lists a few cities under their old names; show the names people search for.
const CITY_NAMES: Record<string, string> = {
  Calcutta: "Kolkata",
  Saigon: "Ho Chi Minh City",
  Rangoon: "Yangon",
  Katmandu: "Kathmandu",
  Kiev: "Kyiv",
  Dacca: "Dhaka",
};

/** `Asia/Dhaka` → `Dhaka`, `America/Argentina/Buenos_Aires` → `Buenos Aires`. */
export function cityOf(zone: string): string {
  const last = (zone.split("/").at(-1) ?? zone).replaceAll("_", " ");
  return CITY_NAMES[last] ?? last;
}

/** `Bangladesh Standard Time`. */
export const zoneLongName = (date: Date, zone: string) =>
  formatter(LOCALE, zone, { timeZoneName: "long" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value ?? zone;

/** The canonical id for a zone (aliases like `Asia/Kolkata` → what Intl lists), or null if unknown. */
export function canonicalZone(zone: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: zone }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

export type ZoneOption = { id: string; city: string; region: string; longName: string; search: string };

let zoneIndex: ZoneOption[] | null = null;

/** Every zone the browser knows (about 420), built once on first use. */
export function getZoneIndex(now: Date): ZoneOption[] {
  zoneIndex ??= Intl.supportedValuesOf("timeZone").map((id) => {
    const city = cityOf(id);
    const region = id.includes("/") ? id.split("/")[0].replaceAll("_", " ") : "";
    const longName = zoneLongName(now, id);
    return { id, city, region, longName, search: `${city} ${region} ${longName} ${id}`.toLowerCase().replaceAll("_", " ") };
  });
  return zoneIndex;
}

// Shown before the user types: places Bangladeshi clinics often deal with.
const POPULAR = [
  "Europe/London",
  "America/New_York",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Kolkata",
  "Asia/Kuala_Lumpur",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "America/Toronto",
];

/** Matching zones for the search box: city-name matches first, at most `limit`. */
export function searchZones(query: string, exclude: string[], now: Date, limit = 50): ZoneOption[] {
  const index = getZoneIndex(now);
  const q = query.trim().toLowerCase().replaceAll("_", " ");
  if (!q) {
    return POPULAR.map((zone) => canonicalZone(zone))
      .map((id) => index.find((option) => option.id === id))
      .filter((option): option is ZoneOption => !!option && !exclude.includes(option.id));
  }
  const starts: ZoneOption[] = [];
  const contains: ZoneOption[] = [];
  for (const option of index) {
    if (exclude.includes(option.id)) continue;
    const city = option.city.toLowerCase();
    if (city.startsWith(q)) starts.push(option);
    else if (option.search.includes(q)) contains.push(option);
  }
  return [...starts, ...contains].slice(0, limit);
}
