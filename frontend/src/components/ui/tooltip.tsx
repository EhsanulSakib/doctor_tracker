"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Portal } from "./portal";

type Side = "top" | "right" | "bottom" | "left";

const GAP = 8;
const HOVER_DELAY_MS = 300;

/** Where the bubble goes and which way it slides in from. */
const PLACEMENT: Record<Side, { className: string; from: { x?: number; y?: number } }> = {
  top: { className: "-translate-x-1/2 -translate-y-full", from: { y: 4 } },
  bottom: { className: "-translate-x-1/2", from: { y: -4 } },
  right: { className: "-translate-y-1/2", from: { x: -4 } },
  left: { className: "-translate-x-full -translate-y-1/2", from: { x: 4 } },
};

function anchor(rect: DOMRect, side: Side) {
  if (side === "top") return { left: rect.left + rect.width / 2, top: rect.top - GAP };
  if (side === "bottom") return { left: rect.left + rect.width / 2, top: rect.bottom + GAP };
  if (side === "right") return { left: rect.right + GAP, top: rect.top + rect.height / 2 };
  return { left: rect.left - GAP, top: rect.top + rect.height / 2 };
}

type Tip = { text: string; side: Side; left: number; top: number; id: number };

/**
 * The app's only tooltip. Mounted once (app/providers.tsx): any element with `data-tooltip="…"` (and
 * optionally `data-tooltip-side`) gets an animated label on mouse hover and keyboard focus. One shared
 * bubble and document-level listeners, so tooltips cost nothing per element and add no wrapper markup.
 * Visual only (aria-hidden): the element keeps its own accessible name.
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: Element | null = null;
    let id = 0;

    const show = (el: Element, delay: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const text = el.getAttribute("data-tooltip");
        if (!text || !el.isConnected) return;
        const side = (el.getAttribute("data-tooltip-side") as Side | null) ?? "top";
        setTip({ text, side, ...anchor(el.getBoundingClientRect(), side), id: ++id });
      }, delay);
    };
    const hide = () => {
      clearTimeout(timer);
      current = null;
      setTip(null);
    };
    const target = (event: Event) => (event.target instanceof Element ? event.target.closest("[data-tooltip]") : null);

    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const el = target(event);
      if (el === current) return;
      current = el;
      if (el?.getAttribute("data-tooltip")) show(el, HOVER_DELAY_MS);
      else hide();
    };
    const onFocus = (event: FocusEvent) => {
      const el = target(event);
      if (el && event.target instanceof Element && event.target.matches(":focus-visible")) {
        current = el;
        show(el, 0);
      }
    };

    document.addEventListener("pointerover", onOver);
    document.documentElement.addEventListener("pointerleave", hide);
    document.addEventListener("pointerdown", hide, true);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", hide);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", hide);
      document.removeEventListener("pointerdown", hide, true);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", hide);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

  return (
    <Portal>
      <AnimatePresence>
        {tip && (
          <m.span
            key={tip.id}
            aria-hidden
            initial={{ opacity: 0, scale: 0.94, ...PLACEMENT[tip.side].from }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.08 } }}
            transition={{ type: "spring", stiffness: 520, damping: 32, mass: 0.6 }}
            style={{ left: tip.left, top: tip.top }}
            className={cn(
              "pointer-events-none fixed z-80 max-w-72 rounded-control bg-ink px-2.5 py-1.5 text-caption font-medium text-surface shadow-overlay",
              PLACEMENT[tip.side].className,
            )}
          >
            {tip.text}
          </m.span>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** Wraps an element that can't take `data-tooltip` itself (or to place it on a side). Same shared bubble. */
export function Tooltip({
  content,
  side = "top",
  enabled = true,
  className,
  children,
}: {
  content: string;
  side?: Side;
  /** When false no tooltip shows (e.g. the label is already visible). */
  enabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span data-tooltip={enabled ? content : undefined} data-tooltip-side={side} className={cn("inline-flex", className)}>
      {children}
    </span>
  );
}
