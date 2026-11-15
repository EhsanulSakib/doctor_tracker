import type { DoctorStatus, Specialization } from "@/lib/constants";

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
  createdAt: string;
  updatedAt: string;
  patientCount: number;
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
