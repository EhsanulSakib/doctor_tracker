"use client";

import { m } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DOCTOR_STATUS_LABELS,
  GENDER_LABELS,
  PATIENT_STATUS_LABELS,
  PATIENT_STATUS_TONES,
} from "@/lib/constants";
import { EASE_OUT } from "@/lib/motion";
import { cn, formatNumber, formatShortDate } from "@/lib/utils";
import { percent } from "../format";
import type { DashboardStats } from "../types";

const sec = (ms: number) => ms / 1000;

// ─── Recent admissions ───────────────────────────────────────────────────────────────────

/** The newest patients: who came in, for what, under which doctor, and how they are doing now. */
export function RecentAdmissions({ items, delay = 0 }: { items: DashboardStats["recentAdmissions"]; delay?: number }) {
  if (items.length === 0) return <p className="grid h-full place-items-center text-ui text-ink-muted">No patients yet</p>;

  return (
    <ul className="flex h-full flex-col justify-between gap-1">
      {items.map((p, index) => (
        <m.li
          key={p.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT, delay: sec(delay) + index * 0.06 }}
          className="-mx-2 flex min-w-0 items-center gap-3 rounded-control px-2 py-1 transition-colors hover:bg-paper-2"
        >
          <Avatar name={p.name} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-ui leading-5 font-medium text-ink">
              {p.name} <span className="font-normal text-ink-muted">· {p.age}y</span>
            </p>
            <p className="truncate text-xs leading-4 text-ink-muted">
              {p.condition}
              {p.doctor ? (
                <>
                  {" · "}
                  <Link href={`/doctors/${p.doctor.id}`} className="rounded-sm hover:text-ink hover:underline focus-ring">
                    {p.doctor.name}
                  </Link>
                </>
              ) : (
                <span className="text-ink-subtle"> · N/A</span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <Badge tone={PATIENT_STATUS_TONES[p.status]} className="text-caption leading-4">
              {PATIENT_STATUS_LABELS[p.status]}
            </Badge>
            <time dateTime={p.admissionDate} className="text-caption text-ink-subtle tabular-nums">
              {formatShortDate(p.admissionDate)}
            </time>
          </div>
        </m.li>
      ))}
    </ul>
  );
}

// ─── Age groups ──────────────────────────────────────────────────────────────────────────

/** Patients per age band as columns that grow up from the baseline; hover one for its share. Gender split underneath. */
export function AgeColumns({
  groups,
  genders,
  delay = 0,
}: {
  groups: DashboardStats["byAgeGroup"];
  genders: DashboardStats["byGender"];
  delay?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = groups.reduce((sum, g) => sum + g.count, 0);
  const max = Math.max(1, ...groups.map((g) => g.count));
  const genderTotal = genders.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className="flex h-full flex-col gap-3">
      <div
        role="img"
        aria-label={groups.map((g) => `Age ${g.key}: ${g.count} (${percent(g.count, total)})`).join(", ")}
        className="flex min-h-24 flex-1 items-end gap-2 border-b border-line"
      >
        {groups.map((g, index) => {
          const dim = hovered !== null && hovered !== g.key;
          return (
            <div
              key={g.key}
              onPointerEnter={() => setHovered(g.key)}
              onPointerLeave={() => setHovered(null)}
              className="flex h-full flex-1 cursor-default flex-col items-center justify-end"
            >
              <m.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: sec(delay) + 0.45 + index * 0.08 }}
                className="mb-1 text-xs font-medium text-ink tabular-nums"
              >
                {hovered === g.key ? percent(g.count, total) : formatNumber(g.count)}
              </m.span>
              <m.div
                data-tooltip={`Age ${g.key}: ${formatNumber(g.count)} (${percent(g.count, total)})`}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ type: "spring", stiffness: 140, damping: 18, delay: sec(delay) + index * 0.08 }}
                style={{ height: `${Math.max((g.count / max) * 100, g.count > 0 ? 4 : 0)}%`, transformOrigin: "bottom" }}
                className={cn("w-full max-w-12 rounded-t-mark bg-chart-accent transition-opacity duration-200", dim && "opacity-40")}
              />
            </div>
          );
        })}
      </div>
      <div className="-mt-1 flex gap-2">
        {groups.map((g) => (
          <span key={g.key} className="flex-1 text-center text-caption text-ink-muted tabular-nums">
            {g.key}
          </span>
        ))}
      </div>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2.5 text-xs text-ink-muted">
        {genders.map((g) => (
          <span key={g.key}>
            {GENDER_LABELS[g.key]} <span className="font-medium text-ink tabular-nums">{percent(g.count, genderTotal)}</span>
          </span>
        ))}
      </p>
    </div>
  );
}

// ─── Doctor workload ─────────────────────────────────────────────────────────────────────

const STATUS_TEXT = { active: "text-success", on_leave: "text-warning", inactive: "text-ink-subtle" } as const;

/** "11 active · 3 on leave · 1 inactive", each in its status colour (the card's title-row aside). */
export function DoctorStatusSummary({ byStatus }: { byStatus: DashboardStats["doctorsByStatus"] }) {
  return (
    <p className="flex flex-wrap items-center justify-end gap-x-1.5 text-ui font-medium">
      {byStatus.map((s, index) => (
        <span key={s.key} className="flex items-center gap-1.5">
          {index > 0 && (
            <span aria-hidden className="text-line-strong">
              ·
            </span>
          )}
          <span className={STATUS_TEXT[s.key]}>
            {formatNumber(s.count)} {DOCTOR_STATUS_LABELS[s.key].toLowerCase()}
          </span>
        </span>
      ))}
    </p>
  );
}

// ─── Doctor workload (list) ─────────────────────────────────────────────────────────────────────

const WORKLOAD_ROWS = 5;

/** Who carries the most patients (top five), and how much of the team is available right now. */
export function DoctorWorkload({
  doctors,
  delay = 0,
}: {
  doctors: DashboardStats["topDoctors"];
  delay?: number;
}) {
  const top = doctors.slice(0, WORKLOAD_ROWS);
  const max = Math.max(1, ...top.map((d) => d.count));

  return (
    <div className="flex h-full flex-col gap-3">
      {top.length === 0 ? (
        <p className="grid flex-1 place-items-center text-ui text-ink-muted">No patients assigned yet</p>
      ) : (
        <ul className="flex flex-1 flex-col justify-between gap-1">
          {top.map((d, index) => (
            <m.li
              key={d.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT, delay: sec(delay) + index * 0.07 }}
            >
              <Link href={`/doctors/${d.id}`} className="group -mx-2 flex items-center gap-3 rounded-control px-2 py-1 transition-colors hover:bg-paper-2 focus-ring">
                <Avatar name={d.name} src={d.photoUrl} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-ui leading-5 font-medium text-ink group-hover:underline">{d.name}</span>
                    <span className="shrink-0 text-xs font-semibold text-ink tabular-nums">{formatNumber(d.count)}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                      <m.span
                        className="block h-full rounded-full bg-chart-accent"
                        initial={{ width: 0 }}
                        animate={{ width: `${(d.count / max) * 100}%` }}
                        transition={{ duration: 0.8, ease: EASE_OUT, delay: sec(delay) + 0.15 + index * 0.07 }}
                      />
                    </span>
                    <span className="w-24 shrink-0 truncate text-right text-caption text-ink-muted">{d.specialization}</span>
                  </span>
                </span>
              </Link>
            </m.li>
          ))}
        </ul>
      )}
    </div>
  );
}
