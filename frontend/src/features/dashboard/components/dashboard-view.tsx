"use client";

import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  DashboardIcon,
  StethoscopeIcon,
  UserPlusIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigateTransition } from "@/hooks/use-navigate-transition";
import { cn, formatNumber } from "@/lib/utils";
import { percent, UNIT_NOUN } from "../format";
import { RANGE_LABELS, type DashboardRange, type DashboardStats } from "../types";
import { AgeColumns, DoctorStatusSummary, DoctorWorkload, RecentAdmissions } from "./insights";
import { ChartCard, KPI_DETAIL, KPI_GRID, KPI_LABEL, KPI_TILE, KPI_VALUE, KpiTile, RangeTabs } from "./parts";
import { PatientsAreaChart } from "./patients-area-chart";
import { StatusSplit } from "./status-split";

const whole = (n: number) => formatNumber(Math.round(n));

/**
 * The overview. Only "New patients" and the time chart follow the range; the other numbers describe all
 * current data (the API works that way), and their labels say so. On laptops it fills the screen exactly:
 * the chart grid takes the height left under the KPIs and the cards share it.
 */
export function DashboardView({ stats }: { stats: DashboardStats }) {
  const [isPending, go] = useNavigateTransition();
  const { kpis, period, range } = stats;
  const labels = RANGE_LABELS[range];
  const underCare = stats.byStatus.filter((s) => s.key !== "recovered").reduce((sum, s) => sum + s.count, 0);
  const underTreatment = stats.byStatus.find((s) => s.key === "under_treatment")?.count ?? 0;
  const onLeave = stats.doctorsByStatus.find((s) => s.key === "on_leave")?.count ?? 0;

  if (kpis.totalDoctors === 0 && kpis.totalPatients === 0) {
    return (
      <Card>
        <EmptyState
          icon={<DashboardIcon size={20} />}
          title="No data yet"
          action={
            <Link href="/doctors" className={buttonStyles()}>
              Add a doctor
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      <div className="flex flex-wrap items-center gap-3">
        <RangeTabs value={range} onChange={(next: DashboardRange) => go(next === "30d" ? "/dashboard" : `/dashboard?range=${next}`)} />
      </div>

      <div aria-busy={isPending} className={cn("flex flex-col gap-4 transition-opacity duration-200 lg:min-h-0 lg:flex-1", isPending && "opacity-60")}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiTile
            delay={0}
            icon={<StethoscopeIcon size={17} />}
            label="Doctors"
            value={kpis.totalDoctors}
            format={whole}
            detail={onLeave > 0 ? `${formatNumber(kpis.activeDoctors)} active · ${formatNumber(onLeave)} on leave` : `${formatNumber(kpis.activeDoctors)} active`}
          />
          <KpiTile
            delay={50}
            icon={<UsersIcon size={17} />}
            label="Patients"
            value={kpis.totalPatients}
            format={whole}
            detail={`${formatNumber(underCare)} under care`}
          />
          <KpiTile
            delay={100}
            icon={<UserPlusIcon size={17} />}
            label="New patients"
            value={kpis.newPatients.current}
            format={whole}
            detail={<Delta delta={kpis.newPatients.deltaPct} previous={labels.previous} />}
          />
          <KpiTile
            delay={150}
            icon={<AlertTriangleIcon size={17} />}
            label="Under treatment"
            value={underTreatment}
            format={whole}
            detail={`${percent(underTreatment, kpis.totalPatients)} of patients need follow-up`}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,4fr)_minmax(0,6fr)]">
          <ChartCard
            icon={<CalendarIcon size={17} />}
            title={`New patients per ${UNIT_NOUN[period.unit]}`}
            className="h-72 md:col-span-2 lg:col-span-8 lg:h-auto"
            delay={180}
          >
            <PatientsAreaChart data={stats.patientsOverTime} unit={period.unit} delay={380} />
          </ChartCard>

          <ChartCard delay={230} icon={<CheckCircleIcon size={17} />} title="Patient status" className="h-64 md:col-span-2 lg:col-span-4 lg:h-auto">
            <StatusSplit data={stats.byStatus} delay={430} />
          </ChartCard>

          <ChartCard delay={280} icon={<ClockIcon size={17} />} title="Recent admissions" className="md:col-span-2 lg:col-span-5">
            <RecentAdmissions items={stats.recentAdmissions} delay={460} />
          </ChartCard>

          <ChartCard delay={330} icon={<UsersIcon size={17} />} title="Patients by age" className="h-80 lg:col-span-3 lg:h-auto">
            <AgeColumns groups={stats.byAgeGroup} genders={stats.byGender} delay={510} />
          </ChartCard>

          <ChartCard delay={380} icon={<StethoscopeIcon size={17} />} title="Patients per doctor"
            aside={<DoctorStatusSummary byStatus={stats.doctorsByStatus} />}
            className="lg:col-span-4"
          >
            <DoctorWorkload doctors={stats.topDoctors} delay={560} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

/** "▲ 23.5% vs previous 30 days"; "No earlier data to compare" when the API has nothing to compare with. */
function Delta({ delta, previous }: { delta: number | null; previous: string }) {
  if (delta === null) return <>No earlier data to compare</>;
  const up = delta > 0;
  const flat = delta === 0;
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className={cn("inline-flex shrink-0 items-center gap-0.5 font-medium tabular-nums", flat ? "text-ink-muted" : up ? "text-success" : "text-danger")}>
        {!flat && (up ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} />)}
        {Math.abs(delta).toFixed(1)}%
        <span className="sr-only">{flat ? " no change" : up ? " up" : " down"}</span>
      </span>
      <span className="truncate max-sm:hidden">vs {previous}</span>
    </span>
  );
}

/** Same layout as <DashboardView> while the numbers load (tabs, four tiles, five chart cards). */
export function DashboardSkeleton() {
  // Ranked-list cards: one placeholder row per real row, with the real rows' height classes.
  const listCard = (className: string, rows: number) => (
    <Card className={cn("flex min-h-0 flex-col p-4 sm:p-5", className)}>
      <div className="mb-4 flex h-6 shrink-0 items-center gap-2">
        <Skeleton className="size-4 rounded-sm" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex min-h-6 flex-1 items-center gap-3 px-1 max-lg:pointer-coarse:min-h-10 lg:min-h-4.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 flex-1" />
          </div>
        ))}
      </div>
    </Card>
  );
  const card = (className: string, rows: number) => (
    <Card className={cn("flex min-h-0 flex-col p-4 sm:p-5", className)}>
      <div className="mb-4 flex h-6 shrink-0 items-center gap-2">
        <Skeleton className="size-4 rounded-sm" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-around gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-2.5" />
        ))}
      </div>
    </Card>
  );
  return (
    <div aria-hidden className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64 pointer-coarse:h-11" />
      </div>
      <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className={KPI_TILE}>
              <div className={KPI_GRID}>
                <div className={KPI_LABEL}>
                  <Skeleton className="size-4 rounded-sm" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
                <div className={cn(KPI_VALUE, "flex h-9 items-center justify-end")}>
                  <Skeleton className="h-6 w-12" />
                </div>
                <div className={cn(KPI_DETAIL, "flex h-4 items-center")}>
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,4fr)_minmax(0,6fr)]">
          {card("h-72 md:col-span-2 lg:col-span-8 lg:h-auto", 5)}
          {card("h-64 md:col-span-2 lg:col-span-4 lg:h-auto", 3)}
          {listCard("md:col-span-2 lg:col-span-5", 6)}
          {card("h-80 lg:col-span-3 lg:h-auto", 5)}
          {listCard("lg:col-span-4", 6)}
        </div>
      </div>
    </div>
  );
}
