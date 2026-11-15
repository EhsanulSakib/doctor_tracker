"use client";

import { useLayoutEffect, type RefObject } from "react";

type Options = {
  /** Which edge of the anchor the panel lines up with. */
  align?: "start" | "end";
  /** Gap between anchor and panel, in px. */
  offset?: number;
  /** Make the panel at least as wide as the anchor (selects). */
  matchWidth?: boolean;
};

const VIEWPORT_MARGIN = 8;

/**
 * Positions a `position: fixed` panel next to its anchor: below it, or above when there's more room
 * there; kept inside the viewport; re-measured on scroll (any container) and resize.
 *
 * Writes straight to the panel's style instead of React state: no re-render on every scroll frame.
 * Also sets `--panel-max-height`, so a list inside can scroll instead of overflowing the screen.
 */
export function useAnchoredPosition(
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  open: boolean,
  { align = "start", offset = 6, matchWidth = false }: Options = {},
) {
  useLayoutEffect(() => {
    if (!open) return;

    let frame = 0;
    const update = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const panel = panelRef.current;
      if (!anchor || !panel) return;

      if (matchWidth) panel.style.minWidth = `${anchor.width}px`;
      const { width, height } = panel.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;

      const spaceBelow = viewportHeight - anchor.bottom - offset - VIEWPORT_MARGIN;
      const spaceAbove = anchor.top - offset - VIEWPORT_MARGIN;
      const above = height > spaceBelow && spaceAbove > spaceBelow;

      const top = above ? Math.max(VIEWPORT_MARGIN, anchor.top - offset - height) : anchor.bottom + offset;
      const preferredLeft = align === "end" ? anchor.right - width : anchor.left;
      const left = Math.min(Math.max(VIEWPORT_MARGIN, preferredLeft), viewportWidth - width - VIEWPORT_MARGIN);

      panel.style.top = `${Math.round(top)}px`;
      panel.style.left = `${Math.round(Math.max(VIEWPORT_MARGIN, left))}px`;
      panel.style.setProperty("--panel-max-height", `${Math.max(160, Math.floor(above ? spaceAbove : spaceBelow))}px`);
      panel.style.transformOrigin = `${align === "end" ? "right" : "left"} ${above ? "bottom" : "top"}`;
      panel.style.visibility = "visible";
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [open, anchorRef, panelRef, align, offset, matchWidth]);
}
