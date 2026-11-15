import { z } from "zod";
import { DOCTOR_STATUSES, SPECIALIZATIONS, WEEKDAYS, type Weekday } from "@/lib/constants";
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

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const optionalTime = z.string().refine((value) => value === "" || TIME.test(value), "Use the HH:MM format");

export const doctorFormSchema = z
  .object({
  name: z.string().trim().min(1, "Name is required").min(2, "Name is too short").max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().min(1, "Email is required").max(254).pipe(z.email("Enter a valid email address")),
  phone: phoneField,
  specialization: z.enum(SPECIALIZATIONS, "Choose a specialization"),
  hospital: z.string().trim().min(2, "Enter the hospital").max(120, "Hospital is too long"),
  yearsOfExperience: z.number("Enter years of experience").int("Use whole years").min(0, "Cannot be negative").max(60, "Must be 60 or less"),
  joinedAt: pastDateField,
  status: z.enum(DOCTOR_STATUSES, "Choose a status"),
  photoUrl: z.string().nullable(),
  // Profile and chamber details: all optional. An empty field is sent as "" (or null) and clears the value.
  // Oldest first is how the profile lists them; the API sorts by year anyway.
  degrees: z
    .array(
      z.object({
        title: z.string().trim().min(2, "Enter the degree").max(60, "Keep it under 60 characters"),
        institute: z.string().trim().min(2, "Enter the institute").max(120, "Keep it under 120 characters"),
        year: z.number("Enter the year").int("Use a year like 2010").min(1950, "Year is too early").max(new Date().getFullYear(), "Year cannot be in the future"),
      }),
    )
    .max(10, "Up to 10 degrees"),
  registrationNo: z.string().trim().max(30, "Keep it under 30 characters"),
  consultationFee: z
    .number()
    .or(z.nan())
    .transform((value) => (Number.isNaN(value) ? null : value))
    .pipe(z.number().int("Use a whole amount").min(0, "Cannot be negative").max(100_000, "Must be 100,000 or less").nullable()),
  bio: z.string().trim().max(600, "Keep it under 600 characters"),
  chamberRoom: z.string().trim().max(120, "Keep it under 120 characters"),
  chamberDays: z.array(z.enum(WEEKDAYS)),
  chamberStart: optionalTime,
  chamberEnd: optionalTime,
  })
  .refine((v) => !v.chamberStart || !v.chamberEnd || v.chamberEnd > v.chamberStart, { path: ["chamberEnd"], message: "End time must be after the start time" });

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
  photoUrl: string | null;
  /** `year` is NaN while its box is empty. */
  degrees: { title: string; institute: string; year: number }[];
  registrationNo: string;
  /** NaN while empty (number input). */
  consultationFee: number;
  bio: string;
  chamberRoom: string;
  chamberDays: Weekday[];
  chamberStart: string;
  chamberEnd: string;
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
        photoUrl: doctor.photoUrl ?? null,
        degrees: doctor.degrees.map((d) => ({ ...d })),
        registrationNo: doctor.registrationNo ?? "",
        consultationFee: doctor.consultationFee ?? Number.NaN,
        bio: doctor.bio ?? "",
        chamberRoom: doctor.chamberRoom ?? "",
        chamberDays: doctor.chamberDays ?? [],
        chamberStart: doctor.chamberStart ?? "",
        chamberEnd: doctor.chamberEnd ?? "",
      }
    : {
        name: "",
        email: "",
        phone: "",
        specialization: "",
        hospital: "",
        yearsOfExperience: Number.NaN,
        joinedAt: "",
        status: "active",
        photoUrl: null,
        degrees: [],
        registrationNo: "",
        consultationFee: Number.NaN,
        bio: "",
        chamberRoom: "",
        chamberDays: [],
        chamberStart: "",
        chamberEnd: "",
      };
