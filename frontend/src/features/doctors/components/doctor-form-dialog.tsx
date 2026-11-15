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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SuggestInput } from "@/components/ui/suggest-input";
import { refreshNotifications } from "@/features/notifications/types";
import { useToast } from "@/hooks/use-toast";
import { isApiError } from "@/lib/api/errors";
import { DOCTOR_STATUS_LABELS, DOCTOR_STATUSES, PHONE_PLACEHOLDER, SPECIALIZATIONS } from "@/lib/constants";
import { todayIso } from "@/lib/utils";
import { createDoctor, updateDoctor } from "../client";
import { doctorFormDefaults, doctorFormSchema, type DoctorFormValues, type DoctorPayload } from "../schema";
import type { Doctor } from "../types";

const SPECIALIZATION_OPTIONS = SPECIALIZATIONS.map((value) => ({ value, label: value }));
const STATUS_OPTIONS = DOCTOR_STATUSES.map((value) => ({ value, label: DOCTOR_STATUS_LABELS[value] }));
const FIELDS = new Set<string>(["name", "email", "phone", "specialization", "hospital", "yearsOfExperience", "joinedAt", "status"]);

type DoctorFormDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Edit this doctor; null = add a new one. */
  doctor: Doctor | null;
  /** Existing hospital names, suggested while typing. */
  hospitals: string[];
};

/** Add / edit a doctor. The form remounts on every open, so it always starts from the doctor's current values. */
export function DoctorFormDialog({ open, onClose, doctor, hospitals }: DoctorFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const formId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={doctor ? "Edit doctor" : "New doctor"}
      size="lg"
      dismissible={!saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {doctor ? "Save changes" : "Add doctor"}
          </Button>
        </>
      }
    >
      <DoctorForm key={doctor?.id ?? "new"} id={formId} doctor={doctor} hospitals={hospitals} onSavingChange={setSaving} onSaved={onClose} />
    </Dialog>
  );
}

function DoctorForm({
  id,
  doctor,
  hospitals,
  onSavingChange,
  onSaved,
}: {
  id: string;
  doctor: Doctor | null;
  hospitals: string[];
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
  } = useForm<DoctorFormValues, unknown, DoctorPayload>({
    // The inputs allow "" for a not-yet-chosen select; the schema turns valid values into the payload type.
    resolver: zodResolver(doctorFormSchema) as unknown as Resolver<DoctorFormValues, unknown, DoctorPayload>,
    defaultValues: doctorFormDefaults(doctor),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    onSavingChange(true);
    try {
      const saved = doctor ? await updateDoctor(doctor.id, values) : await createDoctor(values);
      toast.success(doctor ? "Changes saved" : "Doctor added", saved.name);
      refreshNotifications();
      router.refresh();
      onSaved();
    } catch (error) {
      if (!isApiError(error)) throw error;
      const fieldErrors = Object.entries(error.fieldErrors).filter(([field]) => FIELDS.has(field));
      for (const [field, message] of fieldErrors) setError(field as keyof DoctorFormValues, { message }, { shouldFocus: true });
      if (fieldErrors.length === 0) setFormError(error.message);
    } finally {
      onSavingChange(false);
    }
  });

  return (
    <form id={id} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      {formError && <FormAlert className="sm:col-span-2">{formError}</FormAlert>}

      <Field label="Full name" required error={errors.name?.message} className="sm:col-span-2">
        {(p) => <Input {...p} {...register("name")} autoComplete="off" placeholder="Dr. Nusrat Jahan" />}
      </Field>

      <Field label="Email" required error={errors.email?.message}>
        {(p) => <Input {...p} {...register("email")} type="email" inputMode="email" autoComplete="off" placeholder="name@example.com" />}
      </Field>

      <Field label="Phone" required error={errors.phone?.message}>
        {(p) => <Input {...p} {...register("phone")} type="tel" inputMode="tel" autoComplete="off" placeholder={PHONE_PLACEHOLDER} />}
      </Field>

      <Field label="Specialization" required error={errors.specialization?.message}>
        {(p, { labelId }) => (
          <Controller
            control={control}
            name="specialization"
            render={({ field }) => (
              <Select {...p} labelId={labelId} value={field.value} onChange={field.onChange} onBlur={field.onBlur} options={SPECIALIZATION_OPTIONS} placeholder="Choose" />
            )}
          />
        )}
      </Field>

      <Field label="Hospital" required error={errors.hospital?.message}>
        {(p) => (
          <Controller
            control={control}
            name="hospital"
            render={({ field }) => (
              <SuggestInput {...p} name={field.name} value={field.value} onChange={field.onChange} onBlur={field.onBlur} suggestions={hospitals} placeholder="Start typing to see existing ones" />
            )}
          />
        )}
      </Field>

      <Field label="Years of experience" required error={errors.yearsOfExperience?.message}>
        {(p) => <Input {...p} {...register("yearsOfExperience", { valueAsNumber: true })} type="number" inputMode="numeric" min={0} max={60} step={1} />}
      </Field>

      <Field label="Joined on" required error={errors.joinedAt?.message}>
        {(p, { labelId }) => (
          <Controller
            control={control}
            name="joinedAt"
            render={({ field }) => <DatePicker {...p} labelId={labelId} value={field.value} onChange={field.onChange} onBlur={field.onBlur} min="1950-01-01" max={todayIso()} />}
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
    </form>
  );
}
