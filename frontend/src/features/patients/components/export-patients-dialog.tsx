"use client";

import { useCallback } from "react";
import { ExportDialog, type ExportCustomFilter, type ExportScope } from "@/components/ui/export-dialog";
import { UsersIcon } from "@/components/ui/icons";
import {
  CONDITIONS,
  GENDER_LABELS,
  GENDERS,
  PATIENT_STATUS_LABELS,
  PATIENT_STATUSES,
  type Condition,
  type Gender,
  type PatientStatus,
} from "@/lib/constants";
import { DEFAULT_PATIENT_EXPORT_COLUMN_IDS, fetchAllPatients, PATIENT_EXPORT_COLUMNS } from "../export";
import type { PatientListParams } from "../params";
import type { Patient } from "../types";

const CUSTOM_FILTERS: ExportCustomFilter[] = [
  { key: "status", label: "Status", options: PATIENT_STATUSES.map((value) => ({ value, label: PATIENT_STATUS_LABELS[value] })), emptyOption: "All statuses" },
  { key: "condition", label: "Condition", options: CONDITIONS.map((value) => ({ value, label: value })), emptyOption: "All conditions" },
  { key: "gender", label: "Gender", options: GENDERS.map((value) => ({ value, label: GENDER_LABELS[value] })), emptyOption: "All genders" },
];

type ExportPatientsDialogProps = {
  open: boolean;
  onClose: () => void;
  params: PatientListParams;
  pageRows: Patient[];
  filteredTotal: number;
  hasFilters: boolean;
};

/** Patients export: the shared export dialog with the patient columns and filters. */
export function ExportPatientsDialog({ open, onClose, params, pageRows, filteredTotal, hasFilters }: ExportPatientsDialogProps) {
  const load = useCallback(
    (scope: Exclude<ExportScope, "page">, custom: Record<string, string>, signal: AbortSignal) => {
      const base = { page: 1, limit: 50, sort: params.sort } satisfies PatientListParams;
      const query: PatientListParams =
        scope === "filtered"
          ? params
          : scope === "all"
            ? base
            : {
                ...base,
                status: (custom.status || undefined) as PatientStatus | undefined,
                condition: (custom.condition || undefined) as Condition | undefined,
                gender: (custom.gender || undefined) as Gender | undefined,
              };
      return fetchAllPatients(query, signal);
    },
    [params],
  );

  return (
    <ExportDialog
      open={open}
      onClose={onClose}
      noun={{ one: "patient", many: "patients" }}
      columns={PATIENT_EXPORT_COLUMNS}
      defaultColumnIds={DEFAULT_PATIENT_EXPORT_COLUMN_IDS}
      pageRows={pageRows}
      page={params.page}
      filteredTotal={filteredTotal}
      hasFilters={hasFilters}
      customFilters={CUSTOM_FILTERS}
      load={load}
      getRowId={(p) => p.id}
      pageIcon={<UsersIcon size={18} />}
    />
  );
}
