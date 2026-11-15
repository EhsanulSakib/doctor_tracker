"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { refreshNotifications } from "@/features/notifications/types";
import { useToast } from "@/hooks/use-toast";
import { isApiError, isReadOnlyError } from "@/lib/api/errors";
import { CONDITIONS, GENDER_LABELS, GENDERS, PATIENT_STATUS_LABELS, PATIENT_STATUSES, PHONE_PLACEHOLDER } from "@/lib/constants";
import { todayIso } from "@/lib/utils";
import { DoctorSelect } from "@/features/doctors/components/doctor-select";
import { createDoctorPatient, createPatient, updatePatient } from "../client";
import { patientFormDefaults, patientFormSchema, type PatientFormValues, type PatientPayload } from "../schema";
import type { Patient } from "../types";

const GENDER_OPTIONS = GENDERS.map((value) => ({ value, label: GENDER_LABELS[value] }));
const CONDITION_OPTIONS = CONDITIONS.map((value) => ({ value, label: value }));
const STATUS_OPTIONS = PATIENT_STATUSES.map((value) => ({ value, label: PATIENT_STATUS_LABELS[value] }));
const FIELDS = new Set<string>(["name", "age", "gender", "phone", "email", "condition", "status", "admissionDate", "notes"]);
/** API field name → form field name. */
const fieldOf = (apiField: string) => (apiField === "doctorId" ? "doctor" : apiField);

type PatientFormDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Edit this patient; null = add a new one. */
  patient: Patient | null;
  /**
   * Doctor profile: every patient here belongs to this doctor (no picker). Without it (patients page)
   * the form has a doctor picker, which also moves an existing patient to another doctor.
   */
  fixedDoctor?: { id: string; name: string };
};

/** Add / edit a patient: from a doctor's profile (doctor fixed) or the patients page (doctor picker). */
export function PatientFormDialog({ open, onClose, patient, fixedDoctor }: PatientFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const formId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={patient ? "Edit patient" : "New patient"}
      description={fixedDoctor ? `Doctor: ${fixedDoctor.name}` : undefined}
      size="lg"
      dismissible={!saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {patient ? "Save changes" : "Add patient"}
          </Button>
        </>
      }
    >
      <PatientForm key={patient?.id ?? "new"} id={formId} patient={patient} fixedDoctor={fixedDoctor} onSavingChange={setSaving} onSaved={onClose} />
    </Dialog>
  );
}

function PatientForm({
  id,
  patient,
  fixedDoctor,
  onSavingChange,
  onSaved,
}: {
  id: string;
  patient: Patient | null;
  fixedDoctor?: { id: string; name: string };
  onSavingChange: (saving: boolean) => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PatientFormValues, unknown, PatientPayload>({
    // The inputs allow "" for a not-yet-chosen select; the schema turns valid values into the payload type.
    resolver: zodResolver(patientFormSchema) as unknown as Resolver<PatientFormValues, unknown, PatientPayload>,
    defaultValues: patientFormDefaults(patient, fixedDoctor),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    onSavingChange(true);
    try {
      const { doctor, ...fields } = values;
      const moved = !!patient && doctor.id !== patient.doctorId;
      const saved = patient
        ? await updatePatient(patient.id, moved ? { ...fields, doctorId: doctor.id } : fields)
        : fixedDoctor
          ? await createDoctorPatient(fixedDoctor.id, fields)
          : await createPatient({ ...fields, doctorId: doctor.id });
      if (moved) toast.success("Patient moved", `${saved.name} is now with ${doctor.name}`);
      else toast.success(patient ? "Changes saved" : "Patient added", saved.name);
      refreshNotifications();
      router.refresh();
      onSaved();
    } catch (error) {
      if (!isApiError(error)) throw error;
      if (isReadOnlyError(error)) return; // shown as a toast
      // With a fixed doctor there is no doctor field to show the error on: it becomes a form error.
      const fieldErrors = Object.entries(error.fieldErrors)
        .map(([field, message]) => [fieldOf(field), message] as const)
        .filter(([field]) => FIELDS.has(field) || (field === "doctor" && !fixedDoctor));
      for (const [field, message] of fieldErrors) setError(field as keyof PatientFormValues, { message }, { shouldFocus: true });
      if (fieldErrors.length === 0) setFormError(error.code === "NOT_FOUND" || error.code === "DOCTOR_NOT_FOUND" ? "This doctor no longer exists." : error.message);
    } finally {
      onSavingChange(false);
    }
  });

  return (
    <form id={id} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      {formError && <FormAlert className="sm:col-span-2">{formError}</FormAlert>}

      <Field label="Full name" required error={errors.name?.message} className="sm:col-span-2">
        {(p) => <Input {...p} {...register("name")} autoComplete="off" placeholder="Rahima Begum" />}
      </Field>
      {!fixedDoctor && (
        <Field label="Doctor" required error={errors.doctor?.message} className="sm:col-span-2">
          {(p, { labelId }) => (
            <Controller
              control={control}
              name="doctor"
              render={({ field }) => <DoctorSelect {...p} labelId={labelId} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />}
            />
          )}
        </Field>
      )}
      <Field label="Age" required error={errors.age?.message}>
        {(p) => <Input {...p} {...register("age", { valueAsNumber: true })} type="number" inputMode="numeric" min={0} max={120} step={1} />}
      </Field>
      <Field label="Gender" required error={errors.gender?.message}>
        {(p, { labelId }) => (
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select {...p} labelId={labelId} value={field.value} onChange={field.onChange} onBlur={field.onBlur} options={GENDER_OPTIONS} placeholder="Choose" />
            )}
          />
        )}
      </Field>
      <Field label="Phone" required error={errors.phone?.message}>
        {(p) => <Input {...p} {...register("phone")} type="tel" inputMode="tel" autoComplete="off" placeholder={PHONE_PLACEHOLDER} />}
      </Field>
      <Field label="Email" error={errors.email?.message}>
        {(p) => <Input {...p} {...register("email")} type="email" inputMode="email" autoComplete="off" placeholder="name@example.com" />}
      </Field>
      <Field label="Condition" required error={errors.condition?.message}>
        {(p, { labelId }) => (
          <Controller
            control={control}
            name="condition"
            render={({ field }) => (
              <Select {...p} labelId={labelId} value={field.value} onChange={field.onChange} onBlur={field.onBlur} options={CONDITION_OPTIONS} placeholder="Choose" />
            )}
          />
        )}
      </Field>
      <Field label="Status" required error={errors.status?.message}>
        {(p, { labelId }) => (
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select {...p} labelId={labelId} value={field.value} onChange={field.onChange} onBlur={field.onBlur} options={STATUS_OPTIONS} placeholder="Choose" />
            )}
          />
        )}
      </Field>
      <Field label="Admitted on" required error={errors.admissionDate?.message}>
        {(p, { labelId }) => (
          <Controller
            control={control}
            name="admissionDate"
            render={({ field }) => <DatePicker {...p} labelId={labelId} value={field.value} onChange={field.onChange} onBlur={field.onBlur} min="1950-01-01" max={todayIso()} />}
          />
        )}
      </Field>
      <Field label="Notes" error={errors.notes?.message} className="sm:col-span-2">
        {(p) => <Textarea {...p} {...register("notes")} rows={3} maxLength={1000} />}
      </Field>
    </form>
  );
}
