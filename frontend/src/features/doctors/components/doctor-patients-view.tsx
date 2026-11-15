"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { FilterIcon, PencilIcon, PlusIcon, TrashIcon, UsersIcon } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DeletePatientDialog } from "@/features/patients/components/delete-patient-dialog";
import { PatientFormDialog } from "@/features/patients/components/patient-form-dialog";
import { patientsHref, type PatientListParams } from "@/features/patients/params";
import type { Patient } from "@/features/patients/types";
import type { PageMeta } from "@/lib/api/types";
import { CONDITIONS, GENDER_LABELS, PATIENT_STATUS_LABELS, PATIENT_STATUS_TONES, PATIENT_STATUSES } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

const STATUS_OPTIONS = PATIENT_STATUSES.map((value) => ({ value, label: PATIENT_STATUS_LABELS[value] }));
const CONDITION_OPTIONS = CONDITIONS.map((value) => ({ value, label: value }));

export const PATIENT_COLUMNS: Column<Patient>[] = [
  {
    id: "name",
    header: "Patient",
    cell: (p) => (
      <div className="min-w-0">
        <p className="truncate text-sm leading-5 font-medium text-ink">{p.name}</p>
        <p className="truncate text-xs leading-4 text-ink-muted tabular-nums">{p.phone}</p>
      </div>
    ),
    sort: { asc: "name", desc: "-name" },
    mobile: "title",
    className: "min-w-56",
    skeleton: (
      <div className="flex flex-col">
        <Skeleton className="my-[3px] h-3.5 w-36" />
        <Skeleton className="my-0.5 h-3 w-28" />
      </div>
    ),
  },
  { id: "age", header: "Age / gender", cell: (p) => `${p.age} · ${GENDER_LABELS[p.gender]}`, mobile: "meta", className: "whitespace-nowrap" },
  { id: "condition", header: "Condition", cell: (p) => p.condition, mobile: "meta", className: "whitespace-nowrap" },
  {
    id: "status",
    header: "Status",
    cell: (p) => (
      <Badge tone={PATIENT_STATUS_TONES[p.status]} dot>
        {PATIENT_STATUS_LABELS[p.status]}
      </Badge>
    ),
    skeleton: <Skeleton className="my-px h-[22px] w-24 rounded-full" />,
  },
  {
    id: "admitted",
    header: "Admitted",
    cell: (p) => formatDate(p.admissionDate),
    sort: { asc: "admissionDate", desc: "-admissionDate", first: "desc" },
    className: "whitespace-nowrap tabular-nums",
  },
];

type DoctorPatientsViewProps = {
  doctor: { id: string; name: string };
  patients: Patient[];
  meta: PageMeta;
  params: PatientListParams;
};

/** The doctor's patients: search, status / condition filters, sortable columns, pages, add / edit / delete. */
export function DoctorPatientsView({ doctor, patients, meta, params }: DoctorPatientsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"create" | "edit" | "delete" | null>(null);
  const [target, setTarget] = useState<Patient | null>(null);
  // Resets the search box only when it is cleared from outside (see DoctorsView).
  const [searchKey, setSearchKey] = useState(0);
  const basePath = `/doctors/${doctor.id}`;

  const navigate = (patch: Partial<PatientListParams>) => startTransition(() => router.replace(patientsHref(basePath, params, patch), { scroll: false }));
  const open = (kind: "create" | "edit" | "delete", patient: Patient | null = null) => {
    setTarget(patient);
    setDialog(kind);
  };
  const hasQuery = !!(params.search || params.status || params.condition);

  return (
    <section aria-labelledby="patients-heading" className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
      <h2 id="patients-heading" className="sr-only">
        Patients
      </h2>
      <div className="grid grid-cols-[1fr_auto] gap-2 md:flex md:items-center">
        <SearchInput
          key={searchKey}
          defaultValue={params.search}
          onSearch={(value) => navigate({ search: value || undefined })}
          label="Search this doctor's patients"
          placeholder="Search by name, phone or email"
          pending={isPending}
          className="min-w-0 md:max-w-80 md:flex-1"
        />
        <Button icon={<PlusIcon />} onClick={() => open("create")} className="max-sm:w-11 max-sm:px-0 md:order-last md:ml-auto">
          <span className="max-sm:sr-only">Add patient</span>
        </Button>
        <div className="col-span-2 grid grid-cols-2 gap-2 md:flex">
          <Select
            aria-label="Status"
            value={params.status ?? ""}
            onChange={(value) => navigate({ status: value || undefined })}
            options={STATUS_OPTIONS}
            emptyOption="All statuses"
            className="md:w-44"
          />
          <Select
            aria-label="Condition"
            value={params.condition ?? ""}
            onChange={(value) => navigate({ condition: value || undefined })}
            options={CONDITION_OPTIONS}
            emptyOption="All conditions"
            className="md:w-48"
          />
        </div>
      </div>

      <div aria-busy={isPending} className={cn("flex min-h-0 flex-col transition-opacity duration-200", isPending && "opacity-60")}>
        <DataTable
          fill
          columns={PATIENT_COLUMNS}
          rows={patients}
          getRowId={(p) => p.id}
          caption={`Patients of ${doctor.name}`}
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
                      navigate({ search: undefined, status: undefined, condition: undefined });
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
                    Add patient
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

      <PatientFormDialog open={dialog === "create" || dialog === "edit"} onClose={() => setDialog(null)} patient={dialog === "create" ? null : target} doctor={doctor} />
      <DeletePatientDialog open={dialog === "delete"} onClose={() => setDialog(null)} patient={target} />
    </section>
  );
}

/** Same layout as <DoctorPatientsView> while the profile page streams in. */
export function DoctorPatientsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
      <div className="grid grid-cols-[1fr_auto] gap-2 md:flex md:items-center">
        <Skeleton className="h-9 min-w-0 pointer-coarse:h-11 md:max-w-80 md:flex-1" />
        <Skeleton className="h-9 w-11 pointer-coarse:h-11 sm:w-32 md:order-last md:ml-auto" />
        <div className="col-span-2 grid grid-cols-2 gap-2 md:flex">
          <Skeleton className="h-9 pointer-coarse:h-11 md:w-44" />
          <Skeleton className="h-9 pointer-coarse:h-11 md:w-48" />
        </div>
      </div>
      <div className="flex min-h-0 flex-col">
        <DataTable fill loading skeletonRows={10} columns={PATIENT_COLUMNS} rows={[]} getRowId={() => ""} caption="Patients" rowActions={() => null} />
      </div>
      <div className="flex shrink-0 flex-col-reverse items-center justify-between gap-3 sm:flex-row">
        <Skeleton className="h-8 w-60 pointer-coarse:h-10" />
        <Skeleton className="h-8 w-40 pointer-coarse:h-10" />
      </div>
    </div>
  );
}
