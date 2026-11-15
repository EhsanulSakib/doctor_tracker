"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DASHBOARD_RANGES, RANGE_LABELS, type DashboardRange } from "../types";

/**
 * A chart's frame: heading, one short factual takeaway computed from the data, and a body that takes the
 * rest of the card's height (on laptops the dashboard fills the screen, so cards share its height).
 */
export function ChartCard({ title, takeaway, className, children }: { title: string; takeaway?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <Card className={cn("flex min-h-0 flex-col p-4", className)}>
      {/* One line (title left, takeaway right): on a laptop every pixel of height goes to the chart. */}
      <div className="mb-2 flex h-5 shrink-0 items-baseline justify-between gap-3">
        <h2 className="shrink-0 text-[13px] leading-5 font-semibold text-ink">{title}</h2>
        {takeaway && <p className="min-w-0 truncate text-xs leading-4 text-ink-muted">{takeaway}</p>}
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </Card>
  );
}

/**
 * A number that counts from its previous value to the new one when it changes (a range switch), written
 * straight to the DOM (no re-render per frame). The first render is the final value, so it's correct
 * without JavaScript, and reduced-motion users get no animation.
 */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    const node = ref.current;
    if (!node) return;
    if (from === value || reduce) {
      node.textContent = format(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.6,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (latest) => {
        node.textContent = format(latest);
      },
    });
    return () => controls.stop();
  }, [value, reduce, format]);

  return <span ref={ref}>{format(value)}</span>;
}

/** Stat tile: label, value (proportional figures at display size), and one line of context. */
export function KpiTile({ label, value, format, detail }: { label: ReactNode; value: number; format: (n: number) => string; detail: ReactNode }) {
  return (
    <Card className="px-4 py-3">
      <p className="truncate text-xs leading-4 font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl leading-7 font-semibold tracking-tight text-ink">
        <AnimatedNumber value={value} format={format} />
      </p>
      {/* Fixed 16px line: an inline icon + figure would otherwise grow the line box by a couple of pixels. */}
      <div className="mt-0.5 flex h-4 items-center overflow-hidden text-xs leading-4 whitespace-nowrap text-ink-muted">{detail}</div>
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
    <div role="radiogroup" aria-label="Time range" className="inline-flex h-9 items-center gap-0.5 rounded-control border border-line bg-surface p-0.5 shadow-card pointer-coarse:h-11">
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
              "h-full rounded-[6px] px-3 text-[13px] font-medium transition-colors focus-ring",
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
