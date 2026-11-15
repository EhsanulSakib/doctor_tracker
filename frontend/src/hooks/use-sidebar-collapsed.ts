"use client";

import { useSyncExternalStore } from "react";
import { readSidebarCollapsed, SIDEBAR_EVENT } from "@/lib/preferences";

const subscribe = (onChange: () => void) => {
  window.addEventListener(SIDEBAR_EVENT, onChange);
  return () => window.removeEventListener(SIDEBAR_EVENT, onChange);
};

/**
 * Whether the sidebar is collapsed, read from `<html data-sidebar>` (set before paint from the saved
 * choice). Through useSyncExternalStore the hydration pass uses the server value (expanded) and React
 * then re-renders with the real one. Reading a store that was already updated during hydration would
 * instead leave server attributes such as `aria-expanded` stale: React doesn't patch attribute
 * mismatches while hydrating, and the shell can hydrate after the preferences have been synced.
 */
export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(subscribe, readSidebarCollapsed, () => false);
}
