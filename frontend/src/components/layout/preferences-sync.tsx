"use client";

import { useEffect } from "react";
import { readSidebarCollapsed, readTheme } from "@/lib/preferences";
import { useAppDispatch } from "@/store/hooks";
import { sidebarCollapsedSet, themeSet } from "@/store/slices/ui";

/**
 * The pre-paint script already applied the saved theme / sidebar to <html>. This copies them into
 * Redux after hydration, so React-rendered state (aria-expanded, labels) matches what's on screen.
 */
export function PreferencesSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(themeSet(readTheme()));
    dispatch(sidebarCollapsedSet(readSidebarCollapsed()));
  }, [dispatch]);

  return null;
}
