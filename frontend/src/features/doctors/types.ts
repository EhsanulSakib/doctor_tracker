import type { AttendanceStatus, DoctorStatus, PatientStatus, Specialization, Weekday } from "@/lib/constants";

/** `GET /api/doctors` row / `GET /api/doctors/:id` (backend module 2.1). Dates are ISO strings. */
export type Doctor = {
  id: string;
  name: string;
  specialization: Specialization;
  hospital: string;
  phone: string;
  email: string;
  status: DoctorStatus;
  yearsOfExperience: number;
  joinedAt: string;
  /** Cloudinary URL, or null (initials are shown). */
  photoUrl: string | null;
  qualifications: string | null;
  /** Oldest first. */
  degrees: Degree[];
  registrationNo: string | null;
  /** In BDT. */
  consultationFee: number | null;
  bio: string | null;
  chamberRoom: string | null;
  /** Week order, Saturday first. */
  chamberDays: Weekday[];
  /** "HH:MM", 24-hour, clinic time. */
  chamberStart: string | null;
  chamberEnd: string | null;
  createdAt: string;
  updatedAt: string;
  patientCount: number;
  patientStats: Record<PatientStatus, number>;
  /** Today in the clinic: a chamber day or not, and the attendance marked so far. */
  today: { date: string; scheduled: boolean; attendance: AttendanceStatus | null };
};

export type Degree = { title: string; institute: string; year: number };

/** `DELETE /api/doctors/:id`: how many of the doctor's patients are now without a doctor ("N/A"). */
export type DeleteDoctorResult = { unassigned: number };

/** `GET /api/doctors/:id/attendance`: only marked days, newest first. */
export type AttendanceHistory = {
  from: string;
  to: string;
  records: { date: string; status: AttendanceStatus }[];
  summary: Record<AttendanceStatus, number>;
};

export const DOCTOR_SORTS = ["-createdAt", "createdAt", "name", "-name", "-joinedAt", "joinedAt", "-yearsOfExperience", "yearsOfExperience"] as const;
export type DoctorSort = (typeof DOCTOR_SORTS)[number];
export const DEFAULT_DOCTOR_SORT: DoctorSort = "-createdAt";

export const DOCTOR_SORT_LABELS: Record<DoctorSort, string> = {
  "-createdAt": "Recently added",
  createdAt: "Oldest added",
  name: "Name, A to Z",
  "-name": "Name, Z to A",
  "-joinedAt": "Joined, newest first",
  joinedAt: "Joined, oldest first",
  "-yearsOfExperience": "Most experience",
  yearsOfExperience: "Least experience",
};

/** "Dr. Nusrat Jahan" → "NJ" (the title isn't an initial). */
export const doctorInitials = (name: string) =>
  name
    .replace(/^dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
