// Fixed value lists mirrored from backend/src/constants/enums.ts (no shared package, by design).
// Keep both files in sync: the API rejects any value that isn't listed there.

export const SPECIALIZATIONS = [
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "General Medicine",
  "Neurology",
  "Oncology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
] as const;

export const DOCTOR_STATUSES = ["active", "on_leave", "inactive"] as const;

export const CONDITIONS = [
  "Hypertension",
  "Diabetes",
  "Asthma",
  "Arthritis",
  "Migraine",
  "Heart Disease",
  "Respiratory Infection",
  "Fracture",
  "Skin Condition",
  "Anxiety",
  "Other",
] as const;

export const PATIENT_STATUSES = ["active", "under_treatment", "recovered"] as const;

export const GENDERS = ["male", "female", "other"] as const;

export type Specialization = (typeof SPECIALIZATIONS)[number];
export type DoctorStatus = (typeof DOCTOR_STATUSES)[number];
export type Condition = (typeof CONDITIONS)[number];
export type PatientStatus = (typeof PATIENT_STATUSES)[number];
export type Gender = (typeof GENDERS)[number];

export const DOCTOR_STATUS_LABELS: Record<DoctorStatus, string> = {
  active: "Active",
  on_leave: "On leave",
  inactive: "Inactive",
};

export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  active: "Active",
  under_treatment: "Under treatment",
  recovered: "Recovered",
};

export const GENDER_LABELS: Record<Gender, string> = { male: "Male", female: "Female", other: "Other" };

/** Badge tone per status (see components/ui/badge.tsx). */
export const DOCTOR_STATUS_TONES = { active: "success", on_leave: "warning", inactive: "neutral" } as const satisfies Record<
  DoctorStatus,
  string
>;
export const PATIENT_STATUS_TONES = { active: "info", under_treatment: "warning", recovered: "success" } as const satisfies Record<
  PatientStatus,
  string
>;

/** Page sizes offered in tables; the API caps `limit` at 50. */
export const PAGE_SIZES = [10, 20, 50] as const;

/** Example shown in phone inputs: a Bangladeshi mobile number. */
export const PHONE_PLACEHOLDER = "+880 1712-345678";
