import type { Condition, Gender, PatientStatus, Specialization } from "@/lib/constants";

/** `GET /api/patients` row (backend module 2.2). Dates are ISO strings. */
export type Patient = {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  email: string | null;
  condition: Condition;
  status: PatientStatus;
  admissionDate: string;
  notes: string | null;
  /** Null when the patient has no doctor (theirs was deleted). */
  doctorId: string | null;
  /** Null when the patient has no doctor: shown as "N/A". */
  doctor: { id: string; name: string; specialization: Specialization } | null;
  createdAt: string;
  updatedAt: string;
};

export const PATIENT_SORTS = ["-admissionDate", "admissionDate", "name", "-name", "-createdAt"] as const;
export type PatientSort = (typeof PATIENT_SORTS)[number];
export const DEFAULT_PATIENT_SORT: PatientSort = "-admissionDate";

export const PATIENT_SORT_LABELS: Record<PatientSort, string> = {
  "-admissionDate": "Admitted, newest first",
  admissionDate: "Admitted, oldest first",
  name: "Name, A to Z",
  "-name": "Name, Z to A",
  "-createdAt": "Recently added",
};
