import { z } from "zod";
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
};

export type PatientPayload = z.output<typeof patientFormSchema>;

export const patientFormDefaults = (patient?: Patient | null): PatientFormValues =>
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
      }
    : { name: "", age: Number.NaN, gender: "", phone: "", email: "", condition: "", status: "active", admissionDate: "", notes: "" };
