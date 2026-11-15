import { z } from "zod";
import type { DoctorOption } from "@/features/doctors/components/doctor-select";
import { pastDateField, phoneField } from "@/features/doctors/schema";
import { CONDITIONS, GENDERS, PATIENT_STATUSES, type Condition, type Gender, type PatientStatus } from "@/lib/constants";
import type { Patient } from "./types";

// Mirrors backend/src/modules/patients/patients.schema.ts. Email and notes are optional; an emptied
// input is sent as "" which the API stores as "no value" (and clears it on edit).

export const patientFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").min(2, "Name is too short").max(80, "Name is too long"),
  age: z.number("Enter an age").int("Use whole years").min(0, "Cannot be negative").max(120, "Must be 120 or less"),
  gender: z.enum(GENDERS, "Choose a gender"),
  phone: phoneField,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address"),
  condition: z.enum(CONDITIONS, "Choose a condition"),
  status: z.enum(PATIENT_STATUSES, "Choose a status"),
  admissionDate: pastDateField,
  notes: z.string().trim().max(1000, "Notes must be 1000 characters or less"),
  // The picked doctor (or the fixed one on a doctor profile); sent to the API as doctorId.
  doctor: z
    .object({ id: z.string(), name: z.string(), specialization: z.string() })
    .nullable()
    .transform((value, ctx) => {
      if (value) return value;
      ctx.addIssue({ code: "custom", message: "Choose a doctor" });
      return z.NEVER;
    }),
});

export type PatientFormValues = {
  name: string;
  age: number;
  gender: Gender | "";
  phone: string;
  email: string;
  condition: Condition | "";
  status: PatientStatus | "";
  admissionDate: string;
  notes: string;
  doctor: DoctorOption | null;
};

export type PatientPayload = z.output<typeof patientFormSchema>;
/** What the API takes: the form values without the doctor object (that goes as doctorId or in the path). */
export type PatientFields = Omit<PatientPayload, "doctor">;

export const patientFormDefaults = (patient: Patient | null, fixedDoctor?: { id: string; name: string }): PatientFormValues =>
  patient
    ? {
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email ?? "",
        condition: patient.condition,
        status: patient.status,
        admissionDate: patient.admissionDate.slice(0, 10),
        notes: patient.notes ?? "",
        doctor: patient.doctor,
      }
    : {
        name: "",
        age: Number.NaN,
        gender: "",
        phone: "",
        email: "",
        condition: "",
        status: "active",
        admissionDate: "",
        notes: "",
        doctor: fixedDoctor ? { ...fixedDoctor, specialization: "" } : null,
      };
