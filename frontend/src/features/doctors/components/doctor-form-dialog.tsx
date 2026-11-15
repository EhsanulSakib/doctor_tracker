"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { ImageUpload } from "@/components/ui/image-upload";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SuggestInput } from "@/components/ui/suggest-input";
import { refreshNotifications } from "@/features/notifications/types";
import { useToast } from "@/hooks/use-toast";
import { isApiError, isReadOnlyError } from "@/lib/api/errors";
import { DOCTOR_STATUS_LABELS, DOCTOR_STATUSES, PHONE_PLACEHOLDER, SPECIALIZATIONS, WEEKDAY_LABELS, WEEKDAYS } from "@/lib/constants";
import { cn, todayIso } from "@/lib/utils";
import { createDoctor, updateDoctor } from "../client";
import { doctorFormDefaults, doctorFormSchema, type DoctorFormValues, type DoctorPayload } from "../schema";
import type { Doctor } from "../types";

const SPECIALIZATION_OPTIONS = SPECIALIZATIONS.map((value) => ({ value, label: value }));
const STATUS_OPTIONS = DOCTOR_STATUSES.map((value) => ({ value, label: DOCTOR_STATUS_LABELS[value] }));
const FIELDS = new Set<string>([
  "name",
  "email",
  "phone",
  "specialization",
  "hospital",
  "yearsOfExperience",
  "joinedAt",
  "status",
  "photoUrl",
  "qualifications",
  "registrationNo",
  "consultationFee",
  "bio",
  "chamberRoom",
  "chamberDays",
  "chamberStart",
  "chamberEnd",
]);

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

  const nameValue = useWatch({ control, name: "name" });
  const degrees = useFieldArray({ control, name: "degrees" });

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
      if (isReadOnlyError(error)) return; // shown as a toast
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

      <div className="sm:col-span-2">
        <p className="mb-2 text-sm font-medium text-ink">Photo</p>
        <Controller
          control={control}
          name="photoUrl"
          render={({ field }) => <ImageUpload kind="doctor" name={nameValue} value={field.value} onChange={field.onChange} size={64} />}
        />
        {errors.photoUrl?.message && <p className="mt-1.5 text-ui text-danger">{errors.photoUrl.message}</p>}
      </div>

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

      <div className="mt-2 border-t border-line pt-4 sm:col-span-2">
        <p className="text-sm font-semibold text-ink">Chamber and profile</p>
      </div>

      <fieldset className="grid gap-2 sm:col-span-2">
        <legend className="mb-2 text-ui font-medium text-ink">Degrees</legend>
        {degrees.fields.map((field, index) => {
          const rowErrors = errors.degrees?.[index];
          return (
            <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-control border border-line p-2.5 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)_6rem_auto] sm:border-0 sm:p-0">
              <Field label={<span className="sr-only">Degree {index + 1}</span>} error={rowErrors?.title?.message} className="col-span-2 sm:col-span-1">
                {(p) => <Input {...p} {...register(`degrees.${index}.title`)} placeholder="MBBS" autoComplete="off" />}
              </Field>
              <Field label={<span className="sr-only">Institute {index + 1}</span>} error={rowErrors?.institute?.message} className="col-span-2 sm:col-span-1">
                {(p) => <Input {...p} {...register(`degrees.${index}.institute`)} placeholder="Dhaka Medical College" autoComplete="off" />}
              </Field>
              <Field label={<span className="sr-only">Passing year {index + 1}</span>} error={rowErrors?.year?.message}>
                {(p) => <Input {...p} {...register(`degrees.${index}.year`, { valueAsNumber: true })} type="number" inputMode="numeric" min={1950} max={new Date().getFullYear()} placeholder="Year" />}
              </Field>
              <IconButton label={`Remove degree ${index + 1}`} icon={<TrashIcon />} onClick={() => degrees.remove(index)} className="self-start hover:bg-danger-soft hover:text-danger" />
            </div>
          );
        })}
        {degrees.fields.length < 10 && (
          <Button size="sm" variant="secondary" icon={<PlusIcon />} onClick={() => degrees.append({ title: "", institute: "", year: Number.NaN })} className="justify-self-start">
            Add degree
          </Button>
        )}
      </fieldset>

      <Field label="BMDC registration no." error={errors.registrationNo?.message}>
        {(p) => <Input {...p} {...register("registrationNo")} autoComplete="off" placeholder="A-45210" />}
      </Field>

      <Field label="Consultation fee (BDT)" error={errors.consultationFee?.message}>
        {(p) => <Input {...p} {...register("consultationFee", { valueAsNumber: true })} type="number" inputMode="numeric" min={0} step={50} placeholder="1000" />}
      </Field>

      <Field label="Chamber days" error={errors.chamberDays?.message} className="sm:col-span-2">
        {(p, { labelId }) => (
          <Controller
            control={control}
            name="chamberDays"
            render={({ field }) => (
              <div id={p.id} role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day) => {
                  const on = field.value.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={on}
                      onClick={() => field.onChange(on ? field.value.filter((d) => d !== day) : WEEKDAYS.filter((d) => d === day || field.value.includes(d)))}
                      className={cn(
                        "h-9 min-w-12 cursor-pointer rounded-control border px-3 text-ui font-medium transition-colors focus-ring pointer-coarse:h-11",
                        on ? "border-accent bg-accent-soft text-accent-fg" : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
                      )}
                    >
                      {WEEKDAY_LABELS[day].short}
                    </button>
                  );
                })}
              </div>
            )}
          />
        )}
      </Field>

      <Field label="Chamber starts" error={errors.chamberStart?.message}>
        {(p) => <Input {...p} {...register("chamberStart")} type="time" step={300} />}
      </Field>

      <Field label="Chamber ends" error={errors.chamberEnd?.message}>
        {(p) => <Input {...p} {...register("chamberEnd")} type="time" step={300} />}
      </Field>

      <Field label="Chamber room" error={errors.chamberRoom?.message} className="sm:col-span-2">
        {(p) => <Input {...p} {...register("chamberRoom")} autoComplete="off" placeholder="Room 304, 3rd floor" />}
      </Field>

      <Field label="Short bio" error={errors.bio?.message} className="sm:col-span-2">
        {(p) => <Textarea {...p} {...register("bio")} rows={3} placeholder="Areas of focus, languages, anything patients should know" />}
      </Field>
    </form>
  );
}
