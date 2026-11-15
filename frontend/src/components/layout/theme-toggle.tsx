"use client";

import { IconButton } from "@/components/ui/icon-button";
import { MoonIcon, SunIcon } from "@/components/ui/icons";
import { applyTheme, readTheme } from "@/lib/preferences";
import { useAppDispatch } from "@/store/hooks";
import { themeSet } from "@/store/slices/ui";

/**
 * Switches light/dark and remembers it. The icon is chosen by CSS (`dark:`), so it's right on the
 * very first paint and never mismatches during hydration.
 */
export function ThemeToggle() {
  const dispatch = useAppDispatch();

  const toggle = () => {
    const next = readTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    dispatch(themeSet(next));
  };

  return (
    <IconButton
      label="Toggle dark theme"
      onClick={toggle}
      icon={
        <>
          <MoonIcon size={18} className="dark:hidden" />
          <SunIcon size={18} className="hidden dark:block" />
        </>
      }
    />
  );
}
