"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DateRangeField } from "@/components/ui/date-range-field";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DOCTOR_STATUS_LABELS, DOCTOR_STATUSES, SPECIALIZATIONS } from "@/lib/constants";
import type { DoctorFilters, DoctorListParams } from "../params";
import { DOCTOR_SORT_LABELS, DOCTOR_SORTS, type DoctorSort } from "../types";

export type FiltersAndSort = DoctorFilters & { sort: DoctorSort };

const SPECIALIZATION_OPTIONS = SPECIALIZATIONS.map((value) => ({ value, label: value }));
const STATUS_OPTIONS = DOCTOR_STATUSES.map((value) => ({ value, label: DOCTOR_STATUS_LABELS[value] }));
const SORT_OPTIONS = DOCTOR_SORTS.map((value) => ({ value, label: DOCTOR_SORT_LABELS[value] }));

type DoctorFiltersDialogProps = {
  open: boolean;
  onClose: () => void;
  params: DoctorListParams;
  hospitals: string[];
  onApply: (next: FiltersAndSort) => void;
};

/**
 * Every filter plus sorting (phones have no sortable column headers). Changes are a draft until
 * "Show results", so the list doesn't reload on every pick. A dialog rather than a popover: it holds
 * selects and a date picker that open their own floating panels, and it becomes a bottom sheet on phones.
 */
export function DoctorFiltersDialog({ open, onClose, params, hospitals, onApply }: DoctorFiltersDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Filters" size="md">
      <FiltersForm params={params} hospitals={hospitals} onApply={onApply} onClose={onClose} />
    </Dialog>
  );
}

const toNumber = (value: string) => (value === "" ? undefined : Math.max(0, Math.min(60, Math.trunc(Number(value)))));

function FiltersForm({ params, hospitals, onApply, onClose }: Omit<DoctorFiltersDialogProps, "open">) {
  const [draft, setDraft] = useState<FiltersAndSort>({
    specialization: params.specialization,
    hospital: params.hospital,
    status: params.status,
    joinedFrom: params.joinedFrom,
    joinedTo: params.joinedTo,
    expMin: params.expMin,
    expMax: params.expMax,
    sort: params.sort,
  });
  const set = (patch: Partial<FiltersAndSort>) => setDraft((current) => ({ ...current, ...patch }));
  const rangeError = draft.expMin !== undefined && draft.expMax !== undefined && draft.expMin > draft.expMax ? "Must be at least the minimum" : undefined;
  const hospitalOptions = hospitals.map((value) => ({ value, label: value }));

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (rangeError) return;
        onApply(draft);
        onClose();
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="Specialization">
        {(p, { labelId }) => (
          <Select {...p} labelId={labelId} value={draft.specialization ?? ""} onChange={(v) => set({ specialization: v || undefined })} options={SPECIALIZATION_OPTIONS} emptyOption="All specializations" />
        )}
      </Field>
      <Field label="Status">
        {(p, { labelId }) => (
          <Select {...p} labelId={labelId} value={draft.status ?? ""} onChange={(v) => set({ status: v || undefined })} options={STATUS_OPTIONS} emptyOption="All statuses" />
        )}
      </Field>
      <Field label="Hospital" className="sm:col-span-2">
        {(p, { labelId }) => (
          <Select {...p} labelId={labelId} value={draft.hospital ?? ""} onChange={(v) => set({ hospital: v || undefined })} options={hospitalOptions} emptyOption="All hospitals" />
        )}
      </Field>
      <div className="grid gap-1.5 sm:col-span-2">
        {/* Visible label only: the picker button already says "Joined between: …" to screen readers. */}
        <span aria-hidden className="text-[13px] font-medium text-ink">
          Joined between
        </span>
        <DateRangeField
          label="Joined between"
          value={{ from: draft.joinedFrom, to: draft.joinedTo }}
          onChange={(range) => set({ joinedFrom: range.from, joinedTo: range.to })}
        />
      </div>
      <Field label="Experience from (years)">
        {(p) => <Input {...p} type="number" inputMode="numeric" min={0} max={60} value={draft.expMin ?? ""} onChange={(e) => set({ expMin: toNumber(e.target.value) })} placeholder="0" />}
      </Field>
      <Field label="Experience up to (years)" error={rangeError}>
        {(p) => <Input {...p} type="number" inputMode="numeric" min={0} max={60} value={draft.expMax ?? ""} onChange={(e) => set({ expMax: toNumber(e.target.value) })} placeholder="60" />}
      </Field>
      <Field label="Sort by" className="sm:col-span-2">
        {(p, { labelId }) => <Select {...p} labelId={labelId} value={draft.sort} onChange={(v) => set({ sort: v || params.sort })} options={SORT_OPTIONS} />}
      </Field>

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-4 sm:col-span-2">
        <Button
          variant="ghost"
          onClick={() => setDraft({ specialization: undefined, hospital: undefined, status: undefined, joinedFrom: undefined, joinedTo: undefined, expMin: undefined, expMax: undefined, sort: draft.sort })}
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
