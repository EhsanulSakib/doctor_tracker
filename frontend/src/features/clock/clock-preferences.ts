"use client";

import { useSyncExternalStore } from "react";
import { canonicalZone, DEFAULT_ZONE, MAX_ZONES } from "./time";

/**
 * Which clocks the topbar shows, saved per browser (like the theme). `main` is the zone shown in the
 * topbar and used for the calendar's "today"; `zones` is the list in the panel, main included.
 * Starts as Bangladesh time only.
 */
export type ClockPreferences = { main: string; zones: string[] };

const STORAGE_KEY = "dt-clocks";
const DEFAULTS: ClockPreferences = { main: DEFAULT_ZONE, zones: [DEFAULT_ZONE] };

const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked (private mode, policy): fall back to the defaults
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab changed the list.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Anything unreadable, unknown or duplicated is dropped; the main zone is always in the list. */
export function parseClockPreferences(raw: string | null | undefined): ClockPreferences {
  if (!raw) return DEFAULTS;
  try {
    const value = JSON.parse(raw) as Partial<ClockPreferences>;
    const zones = [
      ...new Set((Array.isArray(value.zones) ? value.zones : []).map((zone) => (typeof zone === "string" ? canonicalZone(zone) : null))),
    ].filter((zone): zone is string => !!zone);
    const main = (typeof value.main === "string" && canonicalZone(value.main)) || zones[0] || DEFAULT_ZONE;
    if (!zones.includes(main)) zones.unshift(main);
    return { main, zones: zones.slice(0, MAX_ZONES) };
  } catch {
    return DEFAULTS;
  }
}

function save(next: ClockPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Not saved, but this tab still updates below.
  }
  for (const listener of listeners) listener();
}

/** The saved clocks. The server (and hydration) always sees the defaults: Bangladesh time. */
export function useClockPreferences(): ClockPreferences {
  // The raw string is the snapshot: it's stable between changes, unlike a freshly parsed object.
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return parseClockPreferences(raw);
}

export function addZone(prefs: ClockPreferences, zone: string) {
  if (prefs.zones.includes(zone) || prefs.zones.length >= MAX_ZONES) return;
  save({ ...prefs, zones: [...prefs.zones, zone] });
}

export function removeZone(prefs: ClockPreferences, zone: string) {
  if (zone === prefs.main) return;
  save({ ...prefs, zones: prefs.zones.filter((z) => z !== zone) });
}

export function setMainZone(prefs: ClockPreferences, zone: string) {
  save({ main: zone, zones: prefs.zones.includes(zone) ? prefs.zones : [...prefs.zones, zone] });
}
