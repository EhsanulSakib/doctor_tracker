"use client";

import { useSyncExternalStore } from "react";

type Unit = "minute" | "second";

const UNIT_MS: Record<Unit, number> = { minute: 60_000, second: 1_000 };

/**
 * A clock store per unit: one timer, aligned to the start of each minute (or second), shared by every
 * component that reads it. Also re-reads when the tab becomes visible again, because browsers slow
 * timers down in background tabs.
 */
function createClock(unit: Unit) {
  const ms = UNIT_MS[unit];
  const subscribe = (onChange: () => void) => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        onChange();
        schedule();
      }, ms - (Date.now() % ms) + 5);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") onChange();
    };
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  };
  // A number that only changes once per unit, so React re-renders exactly that often.
  const getSnapshot = () => Math.floor(Date.now() / ms);
  return { subscribe, getSnapshot };
}

const clocks = { minute: createClock("minute"), second: createClock("second") };
const getServerSnapshot = () => null;

/**
 * The current time, updated every minute (or second). `null` on the server and during hydration:
 * the server can't know the visitor's "now", so render a same-sized placeholder for that pass.
 */
export function useNow(unit: Unit = "minute"): Date | null {
  const clock = clocks[unit];
  const tick = useSyncExternalStore(clock.subscribe, clock.getSnapshot, getServerSnapshot);
  return tick === null ? null : new Date(tick * UNIT_MS[unit]);
}
