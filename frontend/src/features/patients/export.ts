import { clientFetch } from "@/lib/api/client-fetch";
import type { Paginated } from "@/lib/api/types";
import { GENDER_LABELS, PATIENT_STATUS_LABELS } from "@/lib/constants";
import type { ExportColumn } from "@/lib/export";
import { formatDate } from "@/lib/utils";
import { patientQuery, type PatientListParams } from "./params";
import type { Patient } from "./types";

/** Every column a patient export can have, in table order. */
export const PATIENT_EXPORT_COLUMNS: ExportColumn<Patient>[] = [
  { id: "name", label: "Name", value: (p) => p.name },
  { id: "age", label: "Age", value: (p) => p.age },
  { id: "gender", label: "Gender", value: (p) => GENDER_LABELS[p.gender] },
  { id: "phone", label: "Phone", value: (p) => p.phone },
  { id: "email", label: "Email", value: (p) => p.email ?? "" },
  { id: "condition", label: "Condition", value: (p) => p.condition },
  { id: "status", label: "Status", value: (p) => PATIENT_STATUS_LABELS[p.status] },
  { id: "doctor", label: "Doctor", value: (p) => p.doctor?.name ?? "N/A" },
  { id: "specialization", label: "Specialization", value: (p) => p.doctor?.specialization ?? "" },
  { id: "admitted", label: "Admitted", value: (p) => formatDate(p.admissionDate) },
  { id: "notes", label: "Notes", value: (p) => p.notes ?? "" },
];

/** What a quick (non-custom) export includes. */
export const DEFAULT_PATIENT_EXPORT_COLUMN_IDS = ["name", "age", "gender", "phone", "condition", "status", "doctor", "admitted"];

/** The API caps a page at 50 rows: fetch page after page until every matching patient is in. */
export async function fetchAllPatients(params: PatientListParams, signal?: AbortSignal): Promise<Patient[]> {
  const base = patientQuery({ ...params, page: 1, limit: 50 });
  const first = await clientFetch<Paginated<Patient>>("/patients", { searchParams: { ...base, page: 1, limit: 50 }, signal });
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.meta.totalPages - 1) }, (_, i) =>
      clientFetch<Paginated<Patient>>("/patients", { searchParams: { ...base, page: i + 2, limit: 50 }, signal }),
    ),
  );
  return [...first.data, ...rest.flatMap((page) => page.data)];
}
