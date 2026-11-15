"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn, formatNumber } from "@/lib/utils";
import { axisLabel, bucketLabel, niceTicks } from "../format";
import type { BucketUnit } from "../types";

type Point = { bucket: string; count: number };

const patientsText = (n: number) =>
  `${formatNumber(n)} new ${n === 1 ? "patient" : "patients"}`;

/** About six evenly spaced x labels, always the first and the last bucket. */
function labelIndexes(n: number): number[] {
  if (n <= 7) return Array.from({ length: n }, (_, i) => i);
  const step = Math.ceil((n - 1) / 5);
  const picks = [];
  for (let i = 0; i < n - 1; i += step) picks.push(i);
  if (n - 1 - picks.at(-1)! < step / 2) picks.pop();
  return [...picks, n - 1];
}

/**
 * New patients per bucket as a single-series area chart (2px line, 10% wash, hairline grid on the value
 * axis only). The SVG stretches to its box (`preserveAspectRatio="none"` + non-scaling strokes), so it
 * renders on the server at any size; labels, the crosshair and the dot are HTML on top, so they never
 * stretch. Hover or arrow keys move a crosshair that snaps to the nearest bucket; a hidden table carries
 * every value for screen readers.
 */
export function PatientsAreaChart({
  data,
  unit,
}: {
  data: Point[];
  unit: BucketUnit;
}) {
  const [active, setActive] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const n = data.length;
  const ticks = niceTicks(Math.max(...data.map((d) => d.count), 0));
  const top = ticks.at(-1)!;
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50);
  const y = (count: number) => 100 - (count / top) * 100;

  const line = data
    .map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.count)}`)
    .join(" ");
  const area = `${line} L${x(n - 1)},100 L${x(0)},100 Z`;

  const nearest = (event: PointerEvent<HTMLDivElement>) => {
    const box = plotRef.current?.getBoundingClientRect();
    if (!box || n === 0) return;
    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - box.left) / box.width),
    );
    setActive(Math.round(ratio * (n - 1)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = active ?? n - 1;
    const next =
      event.key === "ArrowRight"
        ? Math.min(n - 1, current + 1)
        : event.key === "ArrowLeft"
          ? Math.max(0, current - 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? n - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  };

  const point = active !== null ? data[active] : null;
  const tooltipLeft = active !== null && x(active) > 60;

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1">
        {/* Value axis labels, aligned with the gridlines. */}
        <div aria-hidden className="relative w-8 shrink-0">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-2 -translate-y-1/2 text-[11px] leading-none text-ink-muted tabular-nums"
              style={{ top: `${y(tick)}%` }}
            >
              {formatNumber(tick)}
            </span>
          ))}
        </div>

        <div
          ref={plotRef}
          // A group, not role=img: an img would hide the live tooltip inside it from screen readers.
          role="group"
          aria-roledescription="chart"
          tabIndex={0}
          aria-label={`New patients per ${unit}. Use the arrow keys to read each ${unit}.`}
          className="relative min-w-0 flex-1 cursor-crosshair rounded-[4px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-fg"
          onPointerMove={nearest}
          onPointerDown={nearest}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((current) => current ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
        >
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden
              className="absolute inset-x-0 h-px bg-line"
              style={{ top: `${y(tick)}%` }}
            />
          ))}

          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            <path d={area} className="fill-chart-accent" fillOpacity={0.1} />
            <path
              d={line}
              fill="none"
              className="stroke-chart-accent"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {point && active !== null && (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-px bg-line-strong"
                style={{ left: `${x(active)}%` }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-accent ring-2 ring-surface"
                style={{ left: `${x(active)}%`, top: `${y(point.count)}%` }}
              />
              <div
                role="status"
                className="pointer-events-none absolute top-1 z-10 rounded-control border border-line bg-surface px-2.5 py-1.5 whitespace-nowrap shadow-overlay"
                style={
                  tooltipLeft
                    ? { right: `calc(${100 - x(active)}% + 10px)` }
                    : { left: `calc(${x(active)}% + 10px)` }
                }
              >
                <p className="text-[13px] leading-5 font-semibold text-ink tabular-nums">
                  {patientsText(point.count)}
                </p>
                <p className="text-[11px] leading-4 text-ink-muted">
                  {bucketLabel(point.bucket, unit)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bucket axis labels. */}
      <div aria-hidden className="relative ml-8 h-5 shrink-0">
        {labelIndexes(n).map((i, k, all) => (
          <span
            key={data[i].bucket}
            // Phones: first, middle and last only (six labels collide on a narrow plot).
            className={cn(
              "absolute top-1.5 text-[11px] leading-none whitespace-nowrap text-ink-muted",
              k !== 0 &&
                k !== all.length - 1 &&
                k !== Math.floor((all.length - 1) / 2) &&
                "max-sm:hidden",
            )}
            style={{
              left: `${x(i)}%`,
              transform:
                i === 0
                  ? "none"
                  : i === n - 1
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            {axisLabel(data[i].bucket, unit, i === 0)}
          </span>
        ))}
      </div>

      {/* sr-only on a wrapper: a <table> ignores the 1px height, and would stretch the page to its full length. */}
      <div className="sr-only">
        <table>
          <caption>New patients per {unit}</caption>
          <thead>
            <tr>
              <th scope="col">
                {unit === "day" ? "Day" : unit === "week" ? "Week" : "Month"}
              </th>
              <th scope="col">New patients</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.bucket}>
                <td>{bucketLabel(d.bucket, unit)}</td>
                <td>{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
