import type { KeyboardEvent } from "react";
import { getFocusable } from "./portal";

// Shared by every modal surface (Dialog, Drawer).

// While a modal is open, #app-root is `inert` (no focus, no clicks, hidden from screen readers) and the
// page doesn't scroll. `scrollbar-gutter: stable` (globals.css) keeps the layout from shifting.
// Counted, so a modal opened from another modal unlocks only when the last one closes.
let openModals = 0;

export function lockApp() {
  openModals += 1;
  if (openModals > 1) return;
  document.documentElement.style.overflow = "hidden";
  document.getElementById("app-root")?.setAttribute("inert", "");
}

export function unlockApp() {
  openModals = Math.max(0, openModals - 1);
  if (openModals > 0) return;
  document.documentElement.style.overflow = "";
  document.getElementById("app-root")?.removeAttribute("inert");
}

/** Keeps Tab inside `container`: past the last control wraps to the first, Shift+Tab before the first to the last. */
export function trapTab(event: KeyboardEvent, container: HTMLElement | null) {
  const focusable = getFocusable(container);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === container)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
