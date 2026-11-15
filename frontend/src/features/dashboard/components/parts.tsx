"use client";

import { animate, useReducedMotion } from "motion/react";
import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DASHBOARD_RANGES, RANGE_LABELS, type DashboardRange } from "../types";

/** Entrance: cards rise in one after another (`delay` in ms); transform + opacity only, so no layout shift. */
const entrance = (delay: number) => ({ "data-entrance": "", style: { animationDelay: `${delay}ms` } });

/** A chart's frame: a heading and a body that takes the rest of the card's height. */
export function ChartCard({
  title,
  icon,
  aside,
  delay = 0,
  className,
  children,
}: {
  title: string;
  icon?: ReactNode;
  /** Small text at the right end of the title row. */
  aside?: ReactNode;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card {...entrance(delay)} className={cn("flex min-h-0 flex-col p-4 sm:p-5 motion-safe:animate-rise", className)}>
      <div className="mb-4 flex shrink-0 items-center gap-3">
        <h2 className="flex items-center gap-2 text-base leading-6 font-semibold tracking-tight text-ink">
          {icon && <TitleIcon>{icon}</TitleIcon>}
          {title}
        </h2>
        {aside && <div className="ml-auto min-w-0 text-right">{aside}</div>}
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
 * Stat tile layout, shared with the loading skeleton: icon + label on the left; the value with its context
 * line underneath, right-aligned.
 */
export const KPI_TILE = "p-4 sm:p-5";
export const KPI_GRID = "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4";
export const KPI_LABEL = "col-start-1 row-span-2 row-start-1 flex min-w-0 items-center gap-2";
export const KPI_VALUE = "col-start-2 row-start-1 text-right";
export const KPI_DETAIL = "col-start-2 row-start-2 mt-1 justify-end text-right";

/** The plain icon in front of stat tile labels and chart card titles. */
export function TitleIcon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span aria-hidden className={cn("flex shrink-0 items-center text-accent-fg", className)}>
      {children}
    </span>
  );
}

/** Stat tile: icon and label, value (proportional figures at display size), and one line of context. */
export function KpiTile({
  icon,
  label,
  value,
  format,
  detail,
  delay = 0,
}: {
  icon: ReactNode;
  label: ReactNode;
  value: number;
  format: (n: number) => string;
  detail: ReactNode;
  delay?: number;
}) {
  return (
    <Card {...entrance(delay)} className={cn(KPI_TILE, "motion-safe:animate-rise")}>
      <div className={KPI_GRID}>
        <div className={KPI_LABEL}>
          <TitleIcon>{icon}</TitleIcon>
          <p className="min-w-0 truncate text-sm leading-5 font-semibold text-ink-muted sm:text-base sm:leading-6">{label}</p>
        </div>
        <p className={cn(KPI_VALUE, "text-3xl leading-9 font-semibold tracking-tight text-ink tabular-nums")}>
          <AnimatedNumber value={value} format={format} />
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
