import { z } from "zod";
import { DOCTOR_STATUSES, SPECIALIZATIONS } from "@/lib/constants";
import { todayIso } from "@/lib/utils";
import type { Doctor } from "./types";

// Mirrors the backend rules (backend/src/modules/doctors/doctors.schema.ts + lib/schemas.ts) so most
// mistakes are caught before a request; the API stays the source of truth and its field errors are
// mapped back onto the same fields.

export const phoneField = z
  .string()
  .trim()
  .min(1, "Phone is required")
  .refine((value) => /^\+?[\d\s()-]{7,20}$/.test(value) && value.replace(/\D/g, "").length >= 7, "Enter a valid phone number");

export const pastDateField = z
  .string()
  .min(1, "Choose a date")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine((value) => value <= todayIso(), "Date cannot be in the future")
  .refine((value) => value >= "1950-01-01", "Date is too far in the past");

export const doctorFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").min(2, "Name is too short").max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().min(1, "Email is required").max(254).pipe(z.email("Enter a valid email address")),
  phone: phoneField,
  specialization: z.enum(SPECIALIZATIONS, "Choose a specialization"),
  hospital: z.string().trim().min(2, "Enter the hospital").max(120, "Hospital is too long"),
  yearsOfExperience: z.number("Enter years of experience").int("Use whole years").min(0, "Cannot be negative").max(60, "Must be 60 or less"),
  joinedAt: pastDateField,
  status: z.enum(DOCTOR_STATUSES, "Choose a status"),
});

/** What the inputs hold (selects start empty). */
export type DoctorFormValues = {
  name: string;
  email: string;
  phone: string;
  specialization: (typeof SPECIALIZATIONS)[number] | "";
  hospital: string;
  yearsOfExperience: number;
  joinedAt: string;
  status: (typeof DOCTOR_STATUSES)[number] | "";
};

export type DoctorPayload = z.output<typeof doctorFormSchema>;

export const doctorFormDefaults = (doctor?: Doctor | null): DoctorFormValues =>
  doctor
    ? {
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        specialization: doctor.specialization,
        hospital: doctor.hospital,
        yearsOfExperience: doctor.yearsOfExperience,
        joinedAt: doctor.joinedAt.slice(0, 10),
        status: doctor.status,
      }
    : { name: "", email: "", phone: "", specialization: "", hospital: "", yearsOfExperience: Number.NaN, joinedAt: "", status: "active" };
