"use client";

import { useCallback } from "react";
import { ExportDialog, type ExportCustomFilter, type ExportScope } from "@/components/ui/export-dialog";
import { StethoscopeIcon } from "@/components/ui/icons";
import { DOCTOR_STATUS_LABELS, DOCTOR_STATUSES, SPECIALIZATIONS, type DoctorStatus, type Specialization } from "@/lib/constants";
import { DEFAULT_EXPORT_COLUMN_IDS, DOCTOR_EXPORT_COLUMNS, fetchAllDoctors } from "../export";
import { activeFilterCount, type DoctorListParams } from "../params";
import type { Doctor } from "../types";

const CUSTOM_FILTERS: ExportCustomFilter[] = [
  { key: "specialization", label: "Specialization", options: SPECIALIZATIONS.map((value) => ({ value, label: value })), emptyOption: "All specializations" },
  { key: "status", label: "Status", options: DOCTOR_STATUSES.map((value) => ({ value, label: DOCTOR_STATUS_LABELS[value] })), emptyOption: "All statuses" },
];

type ExportDoctorsDialogProps = { open: boolean; onClose: () => void; params: DoctorListParams; pageRows: Doctor[]; filteredTotal: number };

/** Doctors export: the shared export dialog with the doctor columns and filters. */
export function ExportDoctorsDialog({ open, onClose, params, pageRows, filteredTotal }: ExportDoctorsDialogProps) {
  const load = useCallback(
    (scope: Exclude<ExportScope, "page">, custom: Record<string, string>, signal: AbortSignal) => {
      const base = { page: 1, limit: 50, sort: params.sort } satisfies DoctorListParams;
      const query: DoctorListParams =
        scope === "filtered"
          ? params
          : scope === "all"
            ? base
            : { ...base, specialization: (custom.specialization || undefined) as Specialization | undefined, status: (custom.status || undefined) as DoctorStatus | undefined };
      return fetchAllDoctors(query, signal);
    },
    [params],
  );

  return (
    <ExportDialog
      open={open}
      onClose={onClose}
      noun={{ one: "doctor", many: "doctors" }}
      columns={DOCTOR_EXPORT_COLUMNS}
      defaultColumnIds={DEFAULT_EXPORT_COLUMN_IDS}
      pageRows={pageRows}
      page={params.page}
      filteredTotal={filteredTotal}
      hasFilters={activeFilterCount(params) > 0 || !!params.search}
      customFilters={CUSTOM_FILTERS}
      load={load}
      getRowId={(d) => d.id}
      pageIcon={<StethoscopeIcon size={18} />}
    />
  );
}
