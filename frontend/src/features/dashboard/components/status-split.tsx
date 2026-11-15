"use client";

import { m } from "motion/react";
import { useState } from "react";
import { PATIENT_STATUS_LABELS, type PatientStatus } from "@/lib/constants";
import { EASE_OUT } from "@/lib/motion";
import { cn, formatNumber } from "@/lib/utils";
import { percent } from "../format";

// Same hues as the status badges everywhere else; validated as a set (light and dark card surfaces).
const FILL: Record<PatientStatus, string> = {
  active: "bg-chart-active",
  under_treatment: "bg-chart-treatment",
  recovered: "bg-chart-recovered",
};
const STROKE: Record<PatientStatus, string> = {
  active: "stroke-chart-active",
  under_treatment: "stroke-chart-treatment",
  recovered: "stroke-chart-recovered",
};

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Surface gap between segments, in the same units as the circumference (≈2px at the usual size). */
const GAP = 1.6;

/**
 * All patients in three parts, as a donut: segments draw in one after another, the centre shows the total
 * (or the hovered / focused part), and the legend carries every name, count and share, so identity never
 * relies on colour alone. Hovering a legend row highlights its segment and the other way round.
 */
export function StatusSplit({ data, delay = 0 }: { data: { key: PatientStatus; count: number }[]; delay?: number }) {
  const [active, setActive] = useState<PatientStatus | null>(null);
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const shown = data.filter((d) => d.count > 0);
  const focus = active ? data.find((d) => d.key === active) : undefined;

  const segments = shown.map((d, index) => {
    const offset = shown.slice(0, index).reduce((sum, prev) => sum + (prev.count / total) * CIRCUMFERENCE, 0);
    const length = (d.count / total) * CIRCUMFERENCE;
    return { ...d, offset, length: Math.max(length - (shown.length > 1 ? GAP : 0), 0.5) };
  });

  return (
    <div className="flex h-full items-center gap-5 sm:gap-6">
      <div className="relative aspect-square h-full max-h-44 min-h-28 shrink-0">
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label={data.map((d) => `${PATIENT_STATUS_LABELS[d.key]} ${d.count} (${percent(d.count, total)})`).join(", ")}
          className="size-full -rotate-90"
        >
          <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="12" className="stroke-paper-2" />
          {segments.map((s, index) => {
            const dim = active !== null && active !== s.key;
            return (
              <m.circle
                key={s.key}
                cx="50"
                cy="50"
                r={RADIUS}
                fill="none"
                strokeLinecap="butt"
                className={cn(STROKE[s.key], "cursor-pointer transition-opacity duration-200", dim && "opacity-35")}
                strokeDashoffset={-s.offset}
                initial={{ strokeDasharray: `0 ${CIRCUMFERENCE}`, strokeWidth: 12 }}
                animate={{ strokeDasharray: `${s.length} ${CIRCUMFERENCE}`, strokeWidth: active === s.key ? 15 : 12 }}
                transition={{
                  strokeDasharray: { duration: 0.7, ease: EASE_OUT, delay: delay / 1000 + index * 0.15 },
                  strokeWidth: { type: "spring", stiffness: 500, damping: 30 },
                }}
                data-tooltip={`${PATIENT_STATUS_LABELS[s.key]}: ${formatNumber(s.count)} (${percent(s.count, total)})`}
                onPointerEnter={() => setActive(s.key)}
                onPointerLeave={() => setActive(null)}
              >
              </m.circle>
            );
          })}
        </svg>

        {/* Centre readout: the total, or the part being pointed at. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <m.span
            key={focus?.key ?? "total"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="text-2xl leading-7 font-semibold tracking-tight text-ink tabular-nums"
          >
            {focus ? percent(focus.count, total) : formatNumber(total)}
          </m.span>
          <span className="max-w-20 truncate text-caption text-ink-muted">{focus ? PATIENT_STATUS_LABELS[focus.key] : "patients"}</span>
        </div>
      </div>

      <ul className="grid min-w-0 flex-1 gap-1">
        {data.map((d, index) => (
          <m.li
            key={d.key}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT, delay: delay / 1000 + 0.2 + index * 0.08 }}
            onPointerEnter={() => setActive(d.key)}
            onPointerLeave={() => setActive(null)}
            className={cn(
              "-mx-2 flex items-center gap-2.5 rounded-control px-2 py-1.5 text-ui leading-4.5 transition-colors",
              active === d.key && "bg-paper-2",
            )}
          >
            <span aria-hidden className={cn("size-2.5 shrink-0 rounded-mark", FILL[d.key])} />
            <span className="min-w-0 flex-1 truncate text-ink">{PATIENT_STATUS_LABELS[d.key]}</span>
            <span className="font-medium text-ink tabular-nums">{formatNumber(d.count)}</span>
            <span className="w-10 text-right text-ink-muted tabular-nums">{percent(d.count, total)}</span>
          </m.li>
        ))}
      </ul>
    </div>
  );
}
