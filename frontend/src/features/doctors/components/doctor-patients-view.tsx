"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { EyeIcon, FilterIcon, PencilIcon, PlusIcon, TrashIcon, UsersIcon } from "@/components/ui/icons";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DeletePatientDialog } from "@/features/patients/components/delete-patient-dialog";
import { PatientFormDialog } from "@/features/patients/components/patient-form-dialog";
import { patientsHref, type PatientListParams } from "@/features/patients/params";
import type { Patient } from "@/features/patients/types";
import { useNavigateTransition } from "@/hooks/use-navigate-transition";
import type { PageMeta } from "@/lib/api/types";
import type { Doctor } from "../types";
import { CONDITIONS, GENDER_LABELS, PATIENT_STATUS_LABELS, PATIENT_STATUS_TONES, PATIENT_STATUSES } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

const CONDITION_OPTIONS = CONDITIONS.map((value) => ({ value, label: value }));

/** Avatar + name. */
function PatientCell({ patient }: { patient: Patient }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={patient.name} size={36} />
      <div className="min-w-0">
        <p className="truncate text-sm leading-5 font-semibold text-ink transition-colors group-hover/row:text-accent-fg">{patient.name}</p>
      </div>
    </div>
  );
}

export const PATIENT_COLUMNS: Column<Patient>[] = [
  {
    id: "name",
    header: "Patient",
    cell: (p) => <PatientCell patient={p} />,
    sort: { asc: "name", desc: "-name" },
    mobile: "title",
    className: "min-w-48",
    skeleton: (
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <Skeleton className="h-3.5 w-32" />
      </div>
    ),
  },
  { id: "age", header: "Age", cell: (p) => p.age, align: "right", skeleton: <Skeleton className="my-0.5 ml-auto h-4 w-8" /> },
  { id: "gender", header: "Gender", cell: (p) => GENDER_LABELS[p.gender], mobile: "meta", skeleton: <Skeleton className="my-0.5 h-4 w-14" /> },
  {
    id: "condition",
    header: "Condition",
    // Below 2xl the admission date rides along as a second line (its own column only fits on wide screens).
    cell: (p) => (
      <div className="min-w-0">
        <p className="whitespace-nowrap text-ink">{p.condition}</p>
        <p className="text-xs leading-4 whitespace-nowrap text-ink-muted tabular-nums 2xl:hidden">Admitted {formatDate(p.admissionDate)}</p>
      </div>
    ),
    mobile: "meta",
    skeleton: (
      <div className="flex flex-col">
        <Skeleton className="my-0.75 h-3.5 w-24" />
        <Skeleton className="my-0.5 h-3 w-32 2xl:hidden" />
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: (p) => <Badge tone={PATIENT_STATUS_TONES[p.status]}>{PATIENT_STATUS_LABELS[p.status]}</Badge>,
    skeleton: <Skeleton className="my-0.5 h-4 w-20" />,
  },
  {
    id: "admitted",
    header: "Admitted",
    cell: (p) => formatDate(p.admissionDate),
    sort: { asc: "admissionDate", desc: "-admissionDate", first: "desc" },
    className: "hidden whitespace-nowrap tabular-nums 2xl:table-cell",
  },
];

type DoctorPatientsViewProps = {
  doctor: Pick<Doctor, "id" | "name" | "patientCount" | "patientStats">;
  patients: Patient[];
  meta: PageMeta;
  params: PatientListParams;
};

/** The doctor's patients: search, status / condition filters, sortable columns, pages, add / edit / delete. */
export function DoctorPatientsView({ doctor, patients, meta, params }: DoctorPatientsViewProps) {
  const router = useRouter();
  const [isPending, go] = useNavigateTransition();
  const [dialog, setDialog] = useState<"create" | "edit" | "delete" | null>(null);
  const [target, setTarget] = useState<Patient | null>(null);
  // Resets the search box only when it is cleared from outside (see DoctorsView).
  const [searchKey, setSearchKey] = useState(0);
  const basePath = `/doctors/${doctor.id}`;

  const navigate = (patch: Partial<PatientListParams>) => go(patientsHref(basePath, params, patch));
  const open = (kind: "create" | "edit" | "delete", patient: Patient | null = null) => {
    setTarget(patient);
    setDialog(kind);
  };
  const hasQuery = !!(params.search || params.status || params.condition);
  const tabs = [
    { value: undefined, label: "All", count: doctor.patientCount },
    ...PATIENT_STATUSES.map((status) => ({ value: status, label: PATIENT_STATUS_LABELS[status], count: doctor.patientStats[status] })),
  ];

  return (
    <section aria-label={`Patients of ${doctor.name}`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Status tabs with counts: the quickest way to read this doctor's caseload. */}
        <div role="tablist" aria-label="Patient status" className="flex max-w-full gap-1 overflow-x-auto rounded-control border border-line bg-surface p-1 shadow-card scrollbar-none">
          {tabs.map((tab) => {
            const selected = params.status === tab.value;
            return (
              <button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => !selected && navigate({ status: tab.value })}
                className={cn(
                  "inline-flex h-7 shrink-0 cursor-pointer items-center gap-2 rounded-tag px-3 text-ui font-medium whitespace-nowrap transition-colors focus-ring pointer-coarse:h-9",
                  selected ? "bg-accent text-accent-ink shadow-sm" : "text-ink-muted hover:bg-paper-2 hover:text-ink",
                )}
              >
                {tab.label}
                <span className={cn("tabular-nums", selected ? "text-accent-ink/80" : "text-ink-subtle")}>{tab.count}</span>
              </button>
            );
          })}
        </div>
        <SearchInput
          key={searchKey}
          defaultValue={params.search}
          onSearch={(value) => navigate({ search: value || undefined })}
          label="Search this doctor's patients"
          placeholder="Search by name, phone or email"
          pending={isPending}
          className="min-w-48 flex-1"
        />
        <Select
          aria-label="Condition"
          value={params.condition ?? ""}
          onChange={(value) => navigate({ condition: value || undefined })}
          options={CONDITION_OPTIONS}
          emptyOption="All conditions"
          className="w-full sm:w-44"
        />
        <Button icon={<PlusIcon />} onClick={() => open("create")} className="max-sm:w-full">
          Add patient
        </Button>
      </div>

      <div aria-busy={isPending} className={cn("flex flex-col transition-opacity duration-200", isPending && "opacity-60")}>
        <DataTable
          cardsBelow="lg"
          columns={PATIENT_COLUMNS}
          rows={patients}
          getRowId={(p) => p.id}
          caption={`Patients of ${doctor.name}`}
          sort={params.sort}
          onSortChange={(sort) => navigate({ sort: sort as PatientListParams["sort"] })}
          onRowClick={(p) => router.push(`/patients/${p.id}`)}
          rowActions={(p) => (
            <>
              <IconButton size="sm" label={`View ${p.name}`} title="View patient" icon={<EyeIcon />} onClick={() => router.push(`/patients/${p.id}`)} className="hover:bg-accent-soft hover:text-accent-fg" />
              <IconButton size="sm" label={`Edit ${p.name}`} title="Edit patient" icon={<PencilIcon />} onClick={() => open("edit", p)} className="hover:bg-accent-soft hover:text-accent-fg" />
              <IconButton size="sm" label={`Delete ${p.name}`} title="Delete patient" icon={<TrashIcon />} onClick={() => open("delete", p)} className="hover:bg-danger-soft hover:text-danger" />
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
          />
        </div>
      )}

      <PatientFormDialog open={dialog === "create" || dialog === "edit"} onClose={() => setDialog(null)} patient={dialog === "create" ? null : target} fixedDoctor={{ id: doctor.id, name: doctor.name }} />
      <DeletePatientDialog open={dialog === "delete"} onClose={() => setDialog(null)} patient={target} />
    </section>
  );
}

/** Same layout as <DoctorPatientsView> while the profile page streams in. */
export function DoctorPatientsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-80 max-w-full pointer-coarse:h-11" />
        <Skeleton className="h-9 min-w-48 flex-1 pointer-coarse:h-11" />
        <Skeleton className="h-9 w-full pointer-coarse:h-11 sm:w-44" />
        <Skeleton className="h-9 w-full pointer-coarse:h-11 sm:w-32" />
      </div>
      <div className="flex flex-col">
        <DataTable loading cardsBelow="lg" skeletonRows={8} columns={PATIENT_COLUMNS} rows={[]} getRowId={() => ""} caption="Patients" rowActions={() => null} />
      </div>
    </div>
  );
}
