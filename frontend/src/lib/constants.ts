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

/** Chamber days, in the order of the Bangladeshi working week (Saturday first). */
export const WEEKDAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const WEEKDAY_LABELS: Record<Weekday, { short: string; long: string }> = {
  sat: { short: "Sat", long: "Saturday" },
  sun: { short: "Sun", long: "Sunday" },
  mon: { short: "Mon", long: "Monday" },
  tue: { short: "Tue", long: "Tuesday" },
  wed: { short: "Wed", long: "Wednesday" },
  thu: { short: "Thu", long: "Thursday" },
  fri: { short: "Fri", long: "Friday" },
};

/** Doctors list filter: chamber on this day ("today" = today in the clinic). */
export const CHAMBER_DAY_FILTERS = [...WEEKDAYS, "today"] as const;
export type ChamberDayFilter = (typeof CHAMBER_DAY_FILTERS)[number];

/** Part of the day the chamber starts in: before 12:00, 12:00–16:59, from 17:00. */
export const CHAMBER_SHIFTS = ["morning", "afternoon", "evening"] as const;
export type ChamberShift = (typeof CHAMBER_SHIFTS)[number];
export const CHAMBER_SHIFT_LABELS: Record<ChamberShift, string> = { morning: "Morning (before 12 PM)", afternoon: "Afternoon (12–5 PM)", evening: "Evening (after 5 PM)" };

export const ATTENDANCE_STATUSES = ["present", "absent", "leave"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = { present: "Present", absent: "Absent", leave: "On leave" };

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
