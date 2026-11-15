"use client";

import { animate, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DASHBOARD_RANGES, RANGE_LABELS, type DashboardRange } from "../types";

/**
 * A chart's frame: heading, one short factual takeaway computed from the data, and a body that takes the
 * rest of the card's height (on laptops the dashboard fills the screen, so cards share its height).
 */
/** Entrance: cards rise in one after another (`delay` in ms); transform + opacity only, so no layout shift. */
const entrance = (delay: number) => ({ "data-entrance": "", style: { animationDelay: `${delay}ms` } });

export function ChartCard({ title, takeaway, delay = 0, className, children }: { title: string; takeaway?: ReactNode; delay?: number; className?: string; children: ReactNode }) {
  return (
    <Card {...entrance(delay)} className={cn("flex min-h-0 flex-col p-4 motion-safe:animate-rise", className)}>
      {/* One line (title left, takeaway right): on a laptop every pixel of height goes to the chart. */}
      <div className="mb-2 flex h-5 shrink-0 items-baseline justify-between gap-3">
        <h2 className="shrink-0 text-ui leading-5 font-semibold text-ink">{title}</h2>
        {takeaway && <p className="min-w-0 truncate text-xs leading-4 text-ink-muted">{takeaway}</p>}
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </Card>
  );
}

/**
 * A number that counts up from 0 when the dashboard appears, and from its old value to the new one on a
 * range switch, written straight to the DOM (no re-render per frame). The HTML already holds the final
 * value (correct without JavaScript). The intro count only runs while the tile's entrance animation is
 * just starting, so a late hydration never makes a visible number jump back to 0. No motion for
 * reduced-motion users.
 */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef<number | null>(null);
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const first = previous.current === null;
    const from = first ? 0 : (previous.current as number);
    previous.current = value;
    if (reduce || from === value) {
      node.textContent = format(value);
      return;
    }
    if (first) {
      const intro = node.closest("[data-entrance]")?.getAnimations()[0];
      const elapsed = intro?.currentTime;
      if (typeof elapsed !== "number" || elapsed > 400) {
        node.textContent = format(value);
        return;
      }
      node.textContent = format(0);
    }
    const controls = animate(from, value, {
      duration: first ? 1 : 0.6,
      delay: first ? 0.15 : 0,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (latest) => {
        node.textContent = format(latest);
      },
    });
    return () => controls.stop();
  }, [value, reduce, format]);

  return <span ref={ref}>{format(value)}</span>;
}

/**
 * Stat tile layout, shared with the loading skeleton. When the tile is wide enough (`@kpi`, a container
 * query on the tile's own width, so the sidebar state counts too): label and context on the left, the
 * value on the right. Narrower tiles (phones, small laptops with the sidebar open) stack the three lines.
 */
export const KPI_TILE = "@container px-4 py-3";
export const KPI_GRID = "relative grid @kpi:grid-cols-[minmax(0,1fr)_auto] @kpi:items-center @kpi:gap-x-3 @kpi:py-1";
export const KPI_VALUE = "mt-1 @kpi:col-start-2 @kpi:row-span-2 @kpi:row-start-1 @kpi:mt-0 @kpi:justify-self-end";
export const KPI_DETAIL = "mt-0.5 @kpi:col-start-1 @kpi:mt-1.5";

/** Stat tile: label, value (proportional figures at display size), and one line of context. */
export function KpiTile({ label, value, format, detail, delay = 0 }: { label: ReactNode; value: number; format: (n: number) => string; detail: ReactNode; delay?: number }) {
  return (
    <Card {...entrance(delay)} className={cn(KPI_TILE, "motion-safe:animate-rise")}>
      <div className={KPI_GRID}>
        <p className="truncate text-xs leading-4 font-medium text-ink-muted">{label}</p>
        {/* No layout shift from a right-aligned number that changes width: a hidden copy of the final value
            only reserves the space, and the visible number sits in a box that never moves (the value's own
            box when stacked; the full width of the tile, right-aligned, when side by side). */}
        <p className={cn(KPI_VALUE, "relative text-2xl leading-7 font-semibold tracking-tight text-ink @kpi:static @kpi:invisible @kpi:text-right")}>
          <span className="invisible">{format(value)}</span>
          <span className="visible absolute inset-0 @kpi:top-1/2 @kpi:bottom-auto @kpi:-translate-y-1/2">
            <AnimatedNumber value={value} format={format} />
          </span>
        </p>
        {/* Fixed 16px line: an inline icon + figure would otherwise grow the line box by a couple of pixels. */}
        <div className={cn(KPI_DETAIL, "flex h-4 items-center overflow-hidden text-xs leading-4 whitespace-nowrap text-ink-muted")}>
          {typeof detail === "string" ? <span className="truncate">{detail}</span> : detail}
        </div>
      </div>
    </Card>
  );
}

/**
 * Range switch as a radio group (one choice, arrow keys move it). Changing it navigates; the page keeps
 * showing the current numbers, dimmed, until the new ones arrive.
 */
export function RangeTabs({ value, onChange }: { value: DashboardRange; onChange: (range: DashboardRange) => void }) {
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = DASHBOARD_RANGES[(index + delta + DASHBOARD_RANGES.length) % DASHBOARD_RANGES.length];
    onChange(next);
    const group = event.currentTarget.parentElement;
    requestAnimationFrame(() => group?.querySelector<HTMLButtonElement>(`[data-range="${next}"]`)?.focus());
  };

  return (
    <div role="radiogroup" aria-label="Time range" className="inline-flex h-9 items-center gap-0.5 rounded-control border border-line bg-surface p-0.5 shadow-card pointer-coarse:h-12">
      {DASHBOARD_RANGES.map((range, index) => {
        const selected = range === value;
        return (
          <button
            key={range}
            type="button"
            role="radio"
            aria-checked={selected}
            data-range={range}
            tabIndex={selected ? 0 : -1}
            onClick={() => !selected && onChange(range)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "h-full rounded-tag px-3 text-ui font-medium transition-colors focus-ring",
              selected ? "bg-accent text-accent-ink" : "text-ink-muted hover:bg-paper-2 hover:text-ink",
            )}
          >
            {RANGE_LABELS[range].tab}
          </button>
        );
      })}
    </div>
  );
}
