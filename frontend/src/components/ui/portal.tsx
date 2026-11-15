"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const noopSubscribe = () => () => {};

/** False during server rendering and hydration, true afterwards (no setState-in-effect needed). */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * Renders into document.body, outside #app-root. Overlays therefore escape parent overflow/transform,
 * stack by z-index (dialog 50 · popover/listbox 60 · toasts 70), and stay usable while a modal makes
 * #app-root inert.
 */
export function Portal({ children }: { children: ReactNode }) {
  const isClient = useIsClient();
  return isClient ? createPortal(children, document.body) : null;
}

/** Elements that can receive keyboard focus (used by focus traps and initial focus). */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter((el) => el.getClientRects().length > 0);
}
