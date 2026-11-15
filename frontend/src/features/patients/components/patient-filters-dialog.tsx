"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DateRangeField } from "@/components/ui/date-range-field";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { DoctorSelect, type DoctorOption } from "@/features/doctors/components/doctor-select";
import { CONDITIONS, GENDER_LABELS, GENDERS, PATIENT_STATUS_LABELS, PATIENT_STATUSES, type Condition, type Gender, type PatientStatus } from "@/lib/constants";
import type { PatientListParams } from "../params";
import { PATIENT_SORT_LABELS, PATIENT_SORTS, type PatientSort } from "../types";

export type PatientFilterDraft = {
  status?: PatientStatus;
  condition?: Condition;
  gender?: Gender;
  doctor: DoctorOption | null;
  admittedFrom?: string;
  admittedTo?: string;
  sort: PatientSort;
};

const STATUS_OPTIONS = PATIENT_STATUSES.map((value) => ({ value, label: PATIENT_STATUS_LABELS[value] }));
const CONDITION_OPTIONS = CONDITIONS.map((value) => ({ value, label: value }));
const GENDER_OPTIONS = GENDERS.map((value) => ({ value, label: GENDER_LABELS[value] }));
const SORT_OPTIONS = PATIENT_SORTS.map((value) => ({ value, label: PATIENT_SORT_LABELS[value] }));

type PatientFiltersDialogProps = {
  open: boolean;
  onClose: () => void;
  params: PatientListParams;
  /** The doctor behind `params.doctorId` (its name comes from the server). */
  doctor: DoctorOption | null;
  onApply: (draft: PatientFilterDraft) => void;
};

/** Every patient filter plus sorting, as a draft applied with "Show results" (same pattern as the doctors list). */
export function PatientFiltersDialog({ open, onClose, params, doctor, onApply }: PatientFiltersDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Filters" size="md">
      <FiltersForm params={params} doctor={doctor} onApply={onApply} onClose={onClose} />
    </Dialog>
  );
}

function FiltersForm({ params, doctor, onApply, onClose }: Omit<PatientFiltersDialogProps, "open">) {
  const [draft, setDraft] = useState<PatientFilterDraft>({
    status: params.status,
    condition: params.condition,
    gender: params.gender,
    doctor,
    admittedFrom: params.admittedFrom,
    admittedTo: params.admittedTo,
    sort: params.sort,
  });
  const set = (patch: Partial<PatientFilterDraft>) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft);
        onClose();
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="Status">
        {(p, { labelId }) => (
          <Select {...p} labelId={labelId} value={draft.status ?? ""} onChange={(v) => set({ status: v || undefined })} options={STATUS_OPTIONS} emptyOption="All statuses" />
        )}
      </Field>
      <Field label="Condition">
        {(p, { labelId }) => (
          <Select {...p} labelId={labelId} value={draft.condition ?? ""} onChange={(v) => set({ condition: v || undefined })} options={CONDITION_OPTIONS} emptyOption="All conditions" />
        )}
      </Field>
      <Field label="Gender">
        {(p, { labelId }) => (
          <Select {...p} labelId={labelId} value={draft.gender ?? ""} onChange={(v) => set({ gender: v || undefined })} options={GENDER_OPTIONS} emptyOption="All genders" />
        )}
      </Field>
      <Field label="Doctor">
        {(p, { labelId }) => <DoctorSelect {...p} labelId={labelId} value={draft.doctor} onChange={(d) => set({ doctor: d })} placeholder="All doctors" clearable />}
      </Field>
      <div className="grid gap-1.5 sm:col-span-2">
        {/* Visible label only: the picker button already says "Admitted between: …" to screen readers. */}
        <span aria-hidden className="text-[13px] font-medium text-ink">
          Admitted between
        </span>
        <DateRangeField label="Admitted between" value={{ from: draft.admittedFrom, to: draft.admittedTo }} onChange={(range) => set({ admittedFrom: range.from, admittedTo: range.to })} />
      </div>
      <Field label="Sort by" className="sm:col-span-2">
        {(p, { labelId }) => <Select {...p} labelId={labelId} value={draft.sort} onChange={(v) => set({ sort: v || params.sort })} options={SORT_OPTIONS} />}
      </Field>

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-4 sm:col-span-2">
        <Button
          variant="ghost"
          onClick={() => setDraft({ doctor: null, sort: draft.sort })}
        >
          Clear filters
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Show results</Button>
        </div>
      </div>
    </form>
  );
}
