"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatRange } from "@/components/ui/date-range-field";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { FilterTokens, FiltersButton, type FilterToken } from "@/components/ui/filter-tokens";
import { FilterIcon, PencilIcon, PlusIcon, StethoscopeIcon, TrashIcon } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigateTransition } from "@/hooks/use-navigate-transition";
import type { PageMeta } from "@/lib/api/types";
import { DOCTOR_STATUS_LABELS, DOCTOR_STATUS_TONES, DOCTOR_STATUSES, SPECIALIZATIONS } from "@/lib/constants";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { activeFilterCount, doctorsHref, type DoctorListParams } from "../params";
import { doctorInitials, type Doctor } from "../types";
import { DeleteDoctorDialog } from "./delete-doctor-dialog";
import { DoctorFiltersDialog } from "./doctor-filters-dialog";
import { DoctorFormDialog } from "./doctor-form-dialog";

const SPECIALIZATION_OPTIONS = SPECIALIZATIONS.map((value) => ({ value, label: value }));
const STATUS_OPTIONS = DOCTOR_STATUSES.map((value) => ({ value, label: DOCTOR_STATUS_LABELS[value] }));

export const years = (n: number) => `${n} ${n === 1 ? "yr" : "yrs"}`;

/** Avatar + name (link to the profile) + email. Also the card heading on phones. */
export function DoctorNameCell({ doctor }: { doctor: Pick<Doctor, "id" | "name" | "email"> }) {
  return (
    // Capped width: a long email truncates instead of pushing the table wider than the screen.
    <div className="relative flex max-w-64 min-w-0 items-center gap-3">
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-fg">
        {doctorInitials(doctor.name)}
      </span>
      <div className="min-w-0">
        <Link href={`/doctors/${doctor.id}`} className="block truncate rounded-sm text-sm leading-5 font-medium text-ink transition-colors after:absolute after:inset-x-0 after:-inset-y-2.5 hover:text-accent-fg focus-ring">
          {doctor.name}
        </Link>
        <p className="truncate text-xs leading-4 text-ink-muted">{doctor.email}</p>
      </div>
    </div>
  );
}

/** Same box as DoctorNameCell (32px avatar, 20px + 16px lines), so rows don't change height when data arrives. */
export const doctorNameSkeleton = (
  <div className="flex items-center gap-3">
    <Skeleton className="size-8 shrink-0 rounded-full" />
    {/* flex-col: the bars' vertical margins must add up, not collapse (20px + 16px lines). */}
    <div className="flex flex-col">
      <Skeleton className="my-0.75 h-3.5 w-36" />
      <Skeleton className="my-0.5 h-3 w-44" />
    </div>
  </div>
);

// Module-level: the column definitions never change, so the table never sees "new" columns.
export const DOCTOR_COLUMNS: Column<Doctor>[] = [
  {
    id: "name",
    header: "Doctor",
    cell: (d) => <DoctorNameCell doctor={d} />,
    sort: { asc: "name", desc: "-name" },
    mobile: "title",
    className: "min-w-60",
    skeleton: doctorNameSkeleton,
  },
  {
    id: "specialization",
    header: "Specialization",
    // Below 2xl the hospital rides along as a second line (its own column only fits on very wide screens).
    cell: (d) => (
      <div className="min-w-0">
        <p className="whitespace-nowrap">{d.specialization}</p>
        <p className="hidden max-w-56 truncate text-xs leading-4 text-ink-muted lg:block 2xl:hidden" title={d.hospital}>
          {d.hospital}
        </p>
      </div>
    ),
    mobile: "meta",
    skeleton: (
      <div className="flex flex-col">
        <Skeleton className="my-0.75 h-3.5 w-24" />
        <Skeleton className="my-0.5 h-3 w-40 2xl:hidden" />
      </div>
    ),
  },
  {
    id: "hospital",
    header: "Hospital",
    cell: (d) => (
      <span className="block max-w-60 truncate" title={d.hospital}>
        {d.hospital}
      </span>
    ),
    className: "hidden 2xl:table-cell",
  },
  {
    id: "status",
    header: "Status",
    cell: (d) => (
      <Badge tone={DOCTOR_STATUS_TONES[d.status]} dot>
        {DOCTOR_STATUS_LABELS[d.status]}
      </Badge>
    ),
    skeleton: <Skeleton className="my-px h-5.5 w-20 rounded-full" />,
  },
  {
    id: "experience",
    header: "Experience",
    cell: (d) => years(d.yearsOfExperience),
    align: "right",
    sort: { asc: "yearsOfExperience", desc: "-yearsOfExperience", first: "desc" },
    className: "hidden lg:table-cell",
  },
  { id: "patients", header: "Patients", cell: (d) => formatNumber(d.patientCount), align: "right" },
  {
    id: "joined",
    header: "Joined",
    cell: (d) => formatDate(d.joinedAt),
    sort: { asc: "joinedAt", desc: "-joinedAt", first: "desc" },
    className: "hidden whitespace-nowrap tabular-nums xl:table-cell",
  },
];

type DialogKind = "create" | "edit" | "delete" | "filters";

type DoctorsViewProps = { doctors: Doctor[]; meta: PageMeta; params: DoctorListParams; hospitals: string[] };

/**
 * The doctors list. The URL is the state: every change (search, filter, sort, page) navigates inside a
 * transition, so the current rows stay on screen, dimmed, until the server sends the new page.
 */
export function DoctorsView({ doctors, meta, params, hospitals }: DoctorsViewProps) {
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
    <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
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
          className="hidden w-48 xl:flex"
        />
        <Select
          aria-label="Status"
          value={params.status ?? ""}
          onChange={(value) => navigate({ status: value || undefined })}
          options={STATUS_OPTIONS}
          emptyOption="All statuses"
          className="hidden w-40 xl:flex"
        />
        <FiltersButton count={filterCount} onClick={() => open("filters")} />
        <Button icon={<PlusIcon />} onClick={() => open("create")} className="ml-auto max-sm:w-11 max-sm:px-0">
          <span className="max-sm:sr-only">New doctor</span>
        </Button>
      </div>

      <FilterTokens tokens={tokens} onClearAll={() => navigate(CLEARED_FILTERS)} />

      <div aria-busy={isPending} className={cn("flex min-h-0 flex-col transition-opacity duration-200", isPending && "opacity-60")}>
        <DataTable
          fill
          cardsBelow="lg"
          columns={DOCTOR_COLUMNS}
          rows={doctors}
          getRowId={(d) => d.id}
          caption="Doctors"
          sort={params.sort}
          onSortChange={(sort) => navigate({ sort: sort as DoctorListParams["sort"] })}
          rowActions={(d) => (
            <>
              <IconButton size="sm" label={`Edit ${d.name}`} icon={<PencilIcon />} onClick={() => open("edit", d)} />
              <IconButton size="sm" label={`Delete ${d.name}`} icon={<TrashIcon />} onClick={() => open("delete", d)} className="hover:text-danger" />
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
                    New doctor
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
            onLimitChange={(limit) => navigate({ limit })}
          />
        </div>
      )}

      <DoctorFormDialog open={dialog === "create" || dialog === "edit"} onClose={close} doctor={dialog === "create" ? null : target} hospitals={hospitals} />
      <DeleteDoctorDialog open={dialog === "delete"} onClose={close} doctor={target} />
      <DoctorFiltersDialog open={dialog === "filters"} onClose={close} params={params} hospitals={hospitals} onApply={(next) => navigate(next)} />
    </div>
  );
}

const CLEARED_FILTERS: Partial<DoctorListParams> = {
  specialization: undefined,
  hospital: undefined,
  status: undefined,
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
