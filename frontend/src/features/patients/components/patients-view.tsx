"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatRange } from "@/components/ui/date-range-field";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTokens, FiltersButton, type FilterToken } from "@/components/ui/filter-tokens";
import { IconButton } from "@/components/ui/icon-button";
import { FilterIcon, PencilIcon, PlusIcon, TrashIcon, UsersIcon } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { DoctorOption } from "@/features/doctors/components/doctor-select";
import { useNavigateTransition } from "@/hooks/use-navigate-transition";
import type { PageMeta } from "@/lib/api/types";
import { CONDITIONS, GENDER_LABELS, PATIENT_STATUS_LABELS, PATIENT_STATUS_TONES, PATIENT_STATUSES } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import { patientsHref, type PatientListParams } from "../params";
import type { Patient } from "../types";
import { DeletePatientDialog } from "./delete-patient-dialog";
import { PatientFiltersDialog } from "./patient-filters-dialog";
import { PatientFormDialog } from "./patient-form-dialog";

const STATUS_OPTIONS = PATIENT_STATUSES.map((value) => ({ value, label: PATIENT_STATUS_LABELS[value] }));
const CONDITION_OPTIONS = CONDITIONS.map((value) => ({ value, label: value }));
const BASE_PATH = "/patients";

/** Two stacked skeleton bars with the box of a 20px + 16px two-line cell (flex-col: margins add up, never collapse). */
const twoLineSkeleton = (first: string, second: string) => (
  <div className="flex flex-col">
    <Skeleton className={cn("my-0.75 h-3.5", first)} />
    <Skeleton className={cn("my-0.5 h-3", second)} />
  </div>
);

export const PATIENTS_COLUMNS: Column<Patient>[] = [
  {
    id: "name",
    header: "Patient",
    // Age, gender and phone ride on the second line: a column each wouldn't fit a laptop screen.
    cell: (p) => (
      <div className="max-w-60 min-w-0">
        <p className="truncate text-sm leading-5 font-medium text-ink">{p.name}</p>
        <p className="truncate text-xs leading-4 text-ink-muted tabular-nums">
          {p.age} · {GENDER_LABELS[p.gender]} · {p.phone}
        </p>
      </div>
    ),
    sort: { asc: "name", desc: "-name" },
    mobile: "title",
    className: "min-w-56",
    skeleton: twoLineSkeleton("w-32", "w-44"),
  },
  { id: "condition", header: "Condition", cell: (p) => p.condition, mobile: "meta", className: "whitespace-nowrap" },
  {
    id: "status",
    header: "Status",
    cell: (p) => (
      <Badge tone={PATIENT_STATUS_TONES[p.status]} dot>
        {PATIENT_STATUS_LABELS[p.status]}
      </Badge>
    ),
    skeleton: <Skeleton className="my-px h-5.5 w-24 rounded-full" />,
  },
  {
    id: "doctor",
    header: "Doctor",
    cell: (p) =>
      p.doctor ? (
        <div className="relative max-w-52 min-w-0">
          <Link href={`/doctors/${p.doctor.id}`} className="block truncate rounded-sm text-sm leading-5 text-ink transition-colors after:absolute after:inset-x-0 after:-inset-y-2.5 hover:text-accent-fg focus-ring">
            {p.doctor.name}
          </Link>
          <p className="truncate text-xs leading-4 text-ink-muted">{p.doctor.specialization}</p>
        </div>
      ) : (
        <span className="text-ink-muted">Not assigned</span>
      ),
    skeleton: twoLineSkeleton("w-32", "w-24"),
  },
  {
    id: "admitted",
    header: "Admitted",
    cell: (p) => formatDate(p.admissionDate),
    sort: { asc: "admissionDate", desc: "-admissionDate", first: "desc" },
    className: "hidden whitespace-nowrap tabular-nums xl:table-cell",
  },
];

type DialogKind = "create" | "edit" | "delete" | "filters";

type PatientsViewProps = {
  patients: Patient[];
  meta: PageMeta;
  params: PatientListParams;
  /** The doctor behind `params.doctorId`, for the filter token and picker. */
  doctor: DoctorOption | null;
};

/** All patients: same URL-as-state pattern as the doctors list, plus a doctor filter and reassignment in the form. */
export function PatientsView({ patients, meta, params, doctor }: PatientsViewProps) {
  const [isPending, go] = useNavigateTransition();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [target, setTarget] = useState<Patient | null>(null);
  const [searchKey, setSearchKey] = useState(0);

  const navigate = (patch: Partial<PatientListParams>) => go(patientsHref(BASE_PATH, params, patch));
  const open = (kind: DialogKind, patient: Patient | null = null) => {
    setTarget(patient);
    setDialog(kind);
  };
  const close = () => setDialog(null);

  const tokens = filterTokens(params, doctor, navigate);
  const hasQuery = tokens.length > 0 || !!params.search;

  return (
    <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
      <div className="flex items-center gap-2">
        <SearchInput
          key={searchKey}
          defaultValue={params.search}
          onSearch={(value) => navigate({ search: value || undefined })}
          label="Search patients"
          placeholder="Search by name, phone or email"
          pending={isPending}
          className="min-w-0 flex-1 sm:max-w-80"
        />
        <Select
          aria-label="Status"
          value={params.status ?? ""}
          onChange={(value) => navigate({ status: value || undefined })}
          options={STATUS_OPTIONS}
          emptyOption="All statuses"
          className="hidden w-44 xl:flex"
        />
        <Select
          aria-label="Condition"
          value={params.condition ?? ""}
          onChange={(value) => navigate({ condition: value || undefined })}
          options={CONDITION_OPTIONS}
          emptyOption="All conditions"
          className="hidden w-48 xl:flex"
        />
        <FiltersButton count={tokens.length} onClick={() => open("filters")} />
        <Button icon={<PlusIcon />} onClick={() => open("create")} className="ml-auto max-sm:w-11 max-sm:px-0">
          <span className="max-sm:sr-only">New patient</span>
        </Button>
      </div>

      <FilterTokens tokens={tokens} onClearAll={() => navigate(CLEARED_FILTERS)} />

      <div aria-busy={isPending} className={cn("flex min-h-0 flex-col transition-opacity duration-200", isPending && "opacity-60")}>
        <DataTable
          fill
          cardsBelow="lg"
          columns={PATIENTS_COLUMNS}
          rows={patients}
          getRowId={(p) => p.id}
          caption="Patients"
          sort={params.sort}
          onSortChange={(sort) => navigate({ sort: sort as PatientListParams["sort"] })}
          rowActions={(p) => (
            <>
              <IconButton size="sm" label={`Edit ${p.name}`} icon={<PencilIcon />} onClick={() => open("edit", p)} />
              <IconButton size="sm" label={`Delete ${p.name}`} icon={<TrashIcon />} onClick={() => open("delete", p)} className="hover:text-danger" />
            </>
          )}
          empty={
            hasQuery ? (
              <EmptyState
                icon={<FilterIcon size={20} />}
                title="No patients match"
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
                icon={<UsersIcon size={20} />}
                title="No patients yet"
                action={
                  <Button icon={<PlusIcon />} onClick={() => open("create")}>
                    New patient
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

      <PatientFormDialog open={dialog === "create" || dialog === "edit"} onClose={close} patient={dialog === "create" ? null : target} />
      <DeletePatientDialog open={dialog === "delete"} onClose={close} patient={target} />
      <PatientFiltersDialog
        open={dialog === "filters"}
        onClose={close}
        params={params}
        doctor={doctor}
        onApply={({ doctor: picked, ...rest }) => navigate({ ...rest, doctorId: picked?.id })}
      />
    </div>
  );
}

const CLEARED_FILTERS: Partial<PatientListParams> = {
  status: undefined,
  condition: undefined,
  gender: undefined,
  doctorId: undefined,
  admittedFrom: undefined,
  admittedTo: undefined,
};

function filterTokens(params: PatientListParams, doctor: DoctorOption | null, navigate: (patch: Partial<PatientListParams>) => void): FilterToken[] {
  const tokens: FilterToken[] = [];
  const add = (key: string, label: string, clear: Partial<PatientListParams>) => tokens.push({ key, label, onRemove: () => navigate(clear) });
  if (params.status) add("status", PATIENT_STATUS_LABELS[params.status], { status: undefined });
  if (params.condition) add("condition", params.condition, { condition: undefined });
  if (params.gender) add("gender", GENDER_LABELS[params.gender], { gender: undefined });
  if (params.doctorId && doctor) add("doctor", doctor.name, { doctorId: undefined });
  const admitted = formatRange({ from: params.admittedFrom, to: params.admittedTo });
  if (admitted) add("admitted", `Admitted ${admitted}`, { admittedFrom: undefined, admittedTo: undefined });
  return tokens;
}

/** Same layout as <PatientsView> while the page streams in (toolbar, the real table in loading mode, pagination). */
export function PatientsListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 min-w-0 flex-1 pointer-coarse:h-11 sm:max-w-80" />
        <Skeleton className="hidden h-9 w-44 xl:block" />
        <Skeleton className="hidden h-9 w-48 xl:block" />
        <Skeleton className="h-9 w-11 pointer-coarse:h-11 sm:w-24" />
        <Skeleton className="ml-auto h-9 w-11 pointer-coarse:h-11 sm:w-32" />
      </div>
      <div className="flex min-h-0 flex-col">
        <DataTable fill loading cardsBelow="lg" skeletonRows={10} columns={PATIENTS_COLUMNS} rows={[]} getRowId={() => ""} caption="Patients" rowActions={() => null} />
      </div>
      <div className="flex shrink-0 flex-col-reverse items-center justify-between gap-3 sm:flex-row">
        <Skeleton className="h-8 w-60 pointer-coarse:h-10" />
        <Skeleton className="h-8 w-40 pointer-coarse:h-10" />
      </div>
    </div>
  );
}
