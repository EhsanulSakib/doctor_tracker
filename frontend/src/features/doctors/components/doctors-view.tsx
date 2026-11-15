"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatRange } from "@/components/ui/date-range-field";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTokens, FiltersButton, type FilterToken } from "@/components/ui/filter-tokens";
import { IconButton } from "@/components/ui/icon-button";
import { DownloadIcon, EyeIcon, FilterIcon, PencilIcon, PlusIcon, StethoscopeIcon, TrashIcon } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigateTransition } from "@/hooks/use-navigate-transition";
import { useNow } from "@/hooks/use-now";
import type { PageMeta } from "@/lib/api/types";
import {
  CHAMBER_SHIFT_LABELS,
  DOCTOR_STATUS_LABELS,
  DOCTOR_STATUSES,
  PATIENT_STATUS_LABELS,
  PATIENT_STATUSES,
  SPECIALIZATIONS,
  WEEKDAY_LABELS,
  WEEKDAYS,
} from "@/lib/constants";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { availabilityOf, formatHours } from "../availability";
import { activeFilterCount, doctorsHref, type DoctorListParams } from "../params";
import type { Doctor } from "../types";
import { DeleteDoctorDialog } from "./delete-doctor-dialog";
import { DAY_OPTIONS, DoctorFiltersDialog } from "./doctor-filters-dialog";
import { DoctorFormDialog } from "./doctor-form-dialog";
import { DoctorPatientsPreview } from "./doctor-patients-preview";
import { ExportDoctorsDialog } from "./export-doctors-dialog";

const SPECIALIZATION_OPTIONS = SPECIALIZATIONS.map((value) => ({ value, label: value }));
const STATUS_OPTIONS = DOCTOR_STATUSES.map((value) => ({ value, label: DOCTOR_STATUS_LABELS[value] }));

export const years = (n: number) => `${n} ${n === 1 ? "yr" : "yrs"}`;

/** Avatar + name (link to the profile) + qualifications or email. Also the card heading on phones. */
export function DoctorNameCell({
  doctor,
}: {
  doctor: Pick<Doctor, "id" | "name" | "email"> & { photoUrl?: string | null; qualifications?: string | null };
}) {
  return (
    // Capped width: a long line truncates instead of pushing the table wider than the screen.
    <div className="flex max-w-72 min-w-0 items-center gap-3">
      <Avatar name={doctor.name} src={doctor.photoUrl} size={40} className="ring-2 ring-surface" />
      <div className="min-w-0">
        <Link
          href={`/doctors/${doctor.id}`}
          className="block truncate rounded-sm text-sm leading-5 font-semibold text-ink transition-colors group-hover/row:text-accent-fg hover:text-accent-fg focus-ring"
        >
          {doctor.name}
        </Link>
        <p className="truncate text-xs leading-4 text-ink-muted">{doctor.qualifications || doctor.email}</p>
      </div>
    </div>
  );
}

/** Same box as DoctorNameCell (40px avatar, 20px + 16px lines), so rows don't change height when data arrives. */
export const doctorNameSkeleton = (
  <div className="flex items-center gap-3">
    <Skeleton className="size-10 shrink-0 rounded-full" />
    {/* flex-col: the bars' vertical margins must add up, not collapse (20px + 16px lines). */}
    <div className="flex flex-col">
      <Skeleton className="my-0.75 h-3.5 w-36" />
      <Skeleton className="my-0.5 h-3 w-44" />
    </div>
  </div>
);

/** Patient count (links to the Patients page filtered to this doctor) and how many are still under care. */
function PatientsCell({ doctor }: { doctor: Doctor }) {
  const { patientStats: stats, patientCount: total } = doctor;
  const breakdown = PATIENT_STATUSES.map((status) => `${PATIENT_STATUS_LABELS[status]}: ${stats[status]}`).join(" · ");
  return (
    <div data-tooltip={total ? breakdown : undefined}>
      <Link href={`/patients?doctorId=${doctor.id}`} className="rounded-sm text-sm font-semibold whitespace-nowrap text-ink tabular-nums hover:text-accent-fg hover:underline focus-ring">
        {formatNumber(total)} <span className="font-normal text-ink-muted">{total === 1 ? "patient" : "patients"}</span>
      </Link>
      <p className="mt-0.5 text-xs leading-4 whitespace-nowrap text-ink-muted">{total ? `${formatNumber(stats.active + stats.under_treatment)} under care` : "None yet"}</p>
      <span className="sr-only">{breakdown}</span>
    </div>
  );
}

/** Chamber days over the hours: "Sat · Mon · Wed" / "5:00 PM – 9:00 PM". */
function ScheduleCell({ doctor }: { doctor: Doctor }) {
  const hours = formatHours(doctor.chamberStart, doctor.chamberEnd);
  if (!doctor.chamberDays.length && !hours) return <span className="text-sm text-ink-subtle">Not set</span>;
  return (
    <div className="min-w-0">
      <p className="text-sm leading-5 whitespace-nowrap text-ink">
        {WEEKDAYS.filter((d) => doctor.chamberDays.includes(d))
          .map((d) => WEEKDAY_LABELS[d].short)
          .join(" · ") || "No days set"}
      </p>
      {hours && <p className="mt-0.5 text-xs leading-4 whitespace-nowrap text-ink-muted">{hours}</p>}
    </div>
  );
}

const TONE_TEXT: Record<string, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-ink-muted",
  accent: "text-accent-fg",
};

/** Where the doctor is today: in chamber / due / absent / off / on leave, with the hours under it. */
function TodayCell({ doctor }: { doctor: Doctor }) {
  const now = useNow("minute");
  const a = availabilityOf(doctor, now);
  return (
    <div className="min-w-0">
      <p className={cn("text-sm leading-5 font-semibold whitespace-nowrap", TONE_TEXT[a.tone])}>{a.label}</p>
      {a.detail && <p className="mt-0.5 truncate text-xs leading-4 text-ink-muted">{a.detail}</p>}
    </div>
  );
}

// Module-level: the column definitions never change, so the table never sees "new" columns.
export const DOCTOR_COLUMNS: Column<Doctor>[] = [
  {
    id: "name",
    header: "Doctor",
    cell: (d) => <DoctorNameCell doctor={d} />,
    sort: { asc: "name", desc: "-name" },
    mobile: "title",
    className: "min-w-56",
    skeleton: doctorNameSkeleton,
  },
  {
    id: "specialization",
    header: "Specialization",
    cell: (d) => (
      <div className="min-w-0">
        <p className="text-sm leading-5 font-medium whitespace-nowrap text-accent-fg">{d.specialization}</p>
        <p className="mt-0.5 max-w-48 truncate text-xs leading-4 text-ink-muted" data-tooltip={d.hospital}>
          {d.hospital}
        </p>
      </div>
    ),
    mobile: "meta",
    skeleton: (
      <div className="flex flex-col">
        <Skeleton className="my-0.75 h-3.5 w-28" />
        <Skeleton className="my-0.5 h-3 w-40" />
      </div>
    ),
  },
  {
    id: "today",
    header: "Today",
    cell: (d) => <TodayCell doctor={d} />,
    skeleton: (
      <div className="flex flex-col">
        <Skeleton className="my-0.75 h-3.5 w-24" />
        <Skeleton className="my-0.5 h-3 w-32" />
      </div>
    ),
  },
  {
    id: "schedule",
    header: "Schedule",
    cell: (d) => <ScheduleCell doctor={d} />,
    skeleton: (
      <div className="flex flex-col">
        <Skeleton className="my-0.75 h-3.5 w-32" />
        <Skeleton className="my-0.5 h-3 w-28" />
      </div>
    ),
  },
  {
    id: "patients",
    header: "Patients",
    cell: (d) => <PatientsCell doctor={d} />,
    skeleton: (
      <div className="flex flex-col">
        <Skeleton className="my-0.75 h-3.5 w-20" />
        <Skeleton className="my-0.5 h-3 w-16" />
      </div>
    ),
  },
  {
    id: "experience",
    header: "Experience",
    cell: (d) => years(d.yearsOfExperience),
    align: "right",
    sort: { asc: "yearsOfExperience", desc: "-yearsOfExperience", first: "desc" },
    className: "hidden 2xl:table-cell",
  },
  {
    id: "joined",
    header: "Joined",
    cell: (d) => formatDate(d.joinedAt),
    sort: { asc: "joinedAt", desc: "-joinedAt", first: "desc" },
    className: "hidden whitespace-nowrap tabular-nums 2xl:table-cell",
  },
];

// Module-level, like the columns: the table gets the same object on every render.
const EXPANDABLE = {
  render: (d: Doctor) => <DoctorPatientsPreview doctor={d} />,
  label: (d: Doctor) => `Show patients of ${d.name}`,
};

type DialogKind = "create" | "edit" | "delete" | "filters" | "export";

type DoctorsViewProps = { doctors: Doctor[]; meta: PageMeta; params: DoctorListParams; hospitals: string[] };

/**
 * The doctors list. The URL is the state: every change (search, filter, sort, page) navigates inside a
 * transition, so the current rows stay on screen, dimmed, until the server sends the new page.
 */
export function DoctorsView({ doctors, meta, params, hospitals }: DoctorsViewProps) {
  const router = useRouter();
  const [isPending, go] = useNavigateTransition();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  // Kept after closing, so the dialog doesn't go blank during its exit animation.
  const [target, setTarget] = useState<Doctor | null>(null);
  // Bumped only when something outside the box clears the search, so the box resets then; keying it by
  // the search text itself would remount it (and drop focus) every time a typed search lands in the URL.
  const [searchKey, setSearchKey] = useState(0);

  const navigate = (patch: Partial<DoctorListParams>) => go(doctorsHref(params, patch));
  const open = (kind: DialogKind, doctor: Doctor | null = null) => {
    setTarget(doctor);
    setDialog(kind);
  };
  const close = () => setDialog(null);


  const filterCount = activeFilterCount(params);
  const tokens = filterTokens(params, navigate);
  const hasQuery = filterCount > 0 || !!params.search;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <SearchInput
          key={searchKey}
          defaultValue={params.search}
          onSearch={(value) => navigate({ search: value || undefined })}
          label="Search doctors"
          placeholder="Search by name, email or phone"
          pending={isPending}
          className="min-w-0 flex-1 sm:max-w-80"
        />
        <Select
          aria-label="Specialization"
          value={params.specialization ?? ""}
          onChange={(value) => navigate({ specialization: value || undefined })}
          options={SPECIALIZATION_OPTIONS}
          emptyOption="All specializations"
          className="hidden w-48 2xl:flex"
        />
        <Select
          aria-label="Status"
          value={params.status ?? ""}
          onChange={(value) => navigate({ status: (value || undefined) as DoctorListParams["status"] })}
          options={STATUS_OPTIONS}
          emptyOption="All statuses"
          className="hidden w-40 xl:flex"
        />
        <Select
          aria-label="Chamber day"
          value={params.day ?? ""}
          onChange={(value) => navigate({ day: (value || undefined) as DoctorListParams["day"] })}
          options={DAY_OPTIONS}
          emptyOption="Any day"
          className="hidden w-36 lg:flex"
        />
        <FiltersButton count={filterCount} onClick={() => open("filters")} />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="secondary" icon={<DownloadIcon />} onClick={() => open("export")} className="max-sm:w-11 max-sm:px-0">
            <span className="max-sm:sr-only">Export</span>
          </Button>
          <Button icon={<PlusIcon />} onClick={() => open("create")} className="max-sm:w-11 max-sm:px-0">
            <span className="max-sm:sr-only">Add New Doctor</span>
          </Button>
        </div>
      </div>

      <FilterTokens tokens={tokens} onClearAll={() => navigate(CLEARED_FILTERS)} />

      <div aria-busy={isPending} className={cn("flex flex-col transition-opacity duration-200", isPending && "opacity-60")}>
        <DataTable
          cardsBelow="xl"
          columns={DOCTOR_COLUMNS}
          rows={doctors}
          getRowId={(d) => d.id}
          caption="Doctors"
          sort={params.sort}
          onSortChange={(sort) => navigate({ sort: sort as DoctorListParams["sort"] })}
          onRowClick={(d) => router.push(`/doctors/${d.id}`)}
          expandable={EXPANDABLE}
          rowActions={(d) => (
            <>
              <IconButton size="sm" label={`View ${d.name}`} title="View profile" icon={<EyeIcon />} onClick={() => router.push(`/doctors/${d.id}`)} className="hover:bg-accent-soft hover:text-accent-fg" />
              <IconButton size="sm" label={`Edit ${d.name}`} title="Edit doctor" icon={<PencilIcon />} onClick={() => open("edit", d)} className="hover:bg-accent-soft hover:text-accent-fg" />
              <IconButton size="sm" label={`Delete ${d.name}`} title="Delete doctor" icon={<TrashIcon />} onClick={() => open("delete", d)} className="hover:bg-danger-soft hover:text-danger" />
            </>
          )}
          empty={
            hasQuery ? (
              <EmptyState
                icon={<FilterIcon size={20} />}
                title="No doctors match"
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchKey((key) => key + 1);
                      navigate({ ...CLEARED_FILTERS, search: undefined });
                    }}
                  >
                    Clear search and filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<StethoscopeIcon size={20} />}
                title="No doctors yet"
                action={
                  <Button icon={<PlusIcon />} onClick={() => open("create")}>
                    Add New Doctor
                  </Button>
                }
              />
            )
          }
        />
      </div>

      {meta.total > 0 && (
        <div className="shrink-0">
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            onPageChange={(page) => navigate({ page })}
          />
        </div>
      )}

      <DoctorFormDialog open={dialog === "create" || dialog === "edit"} onClose={close} doctor={dialog === "create" ? null : target} hospitals={hospitals} />
      <DeleteDoctorDialog open={dialog === "delete"} onClose={close} doctor={target} />
      <ExportDoctorsDialog open={dialog === "export"} onClose={close} params={params} pageRows={doctors} filteredTotal={meta.total} />
      <DoctorFiltersDialog open={dialog === "filters"} onClose={close} params={params} hospitals={hospitals} onApply={(next) => navigate(next)} />
    </div>
  );
}

const CLEARED_FILTERS: Partial<DoctorListParams> = {
  specialization: undefined,
  hospital: undefined,
  status: undefined,
  day: undefined,
  shift: undefined,
  joinedFrom: undefined,
  joinedTo: undefined,
  expMin: undefined,
  expMax: undefined,
};

/** One removable token per active filter (search has its own box, so it isn't repeated here). */
function filterTokens(params: DoctorListParams, navigate: (patch: Partial<DoctorListParams>) => void): FilterToken[] {
  const tokens: FilterToken[] = [];
  const add = (key: string, label: string, clear: Partial<DoctorListParams>) => tokens.push({ key, label, onRemove: () => navigate(clear) });
  if (params.specialization) add("specialization", params.specialization, { specialization: undefined });
  if (params.status) add("status", DOCTOR_STATUS_LABELS[params.status], { status: undefined });
  if (params.day) add("day", params.day === "today" ? "Chamber today" : `Chamber on ${WEEKDAY_LABELS[params.day].long}`, { day: undefined });
  if (params.shift) add("shift", CHAMBER_SHIFT_LABELS[params.shift], { shift: undefined });
  if (params.hospital) add("hospital", params.hospital, { hospital: undefined });
  const joined = formatRange({ from: params.joinedFrom, to: params.joinedTo });
  if (joined) add("joined", `Joined ${joined}`, { joinedFrom: undefined, joinedTo: undefined });
  const { expMin, expMax } = params;
  if (expMin !== undefined || expMax !== undefined) {
    const label =
      expMin !== undefined && expMax !== undefined ? `${expMin}–${years(expMax)}` : expMin !== undefined ? `${years(expMin)} or more` : `Up to ${years(expMax!)}`;
    add("experience", `Experience ${label}`, { expMin: undefined, expMax: undefined });
  }
  return tokens;
}
