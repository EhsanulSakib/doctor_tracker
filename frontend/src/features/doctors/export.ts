import { clientFetch } from "@/lib/api/client-fetch";
import type { Paginated } from "@/lib/api/types";
import { DOCTOR_STATUS_LABELS } from "@/lib/constants";
import type { ExportColumn } from "@/lib/export";
import { formatDate } from "@/lib/utils";
import { availabilityOf, formatDays, formatHours } from "./availability";
import { doctorQuery, type DoctorListParams } from "./params";
import type { Doctor } from "./types";

/** Every column a doctor export can have, in table order. */
export const DOCTOR_EXPORT_COLUMNS: ExportColumn<Doctor>[] = [
  { id: "name", label: "Name", value: (d) => d.name },
  { id: "specialization", label: "Specialization", value: (d) => d.specialization },
  { id: "qualifications", label: "Qualifications", value: (d) => d.qualifications ?? "" },
  { id: "hospital", label: "Hospital", value: (d) => d.hospital },
  { id: "status", label: "Status", value: (d) => DOCTOR_STATUS_LABELS[d.status] },
  { id: "today", label: "Today", value: (d) => availabilityOf(d, null).label },
  { id: "email", label: "Email", value: (d) => d.email },
  { id: "phone", label: "Phone", value: (d) => d.phone },
  { id: "experience", label: "Experience (yrs)", value: (d) => d.yearsOfExperience },
  { id: "patients", label: "Patients", value: (d) => d.patientCount },
  { id: "active", label: "Active", value: (d) => d.patientStats.active },
  { id: "underTreatment", label: "Under treatment", value: (d) => d.patientStats.under_treatment },
  { id: "recovered", label: "Recovered", value: (d) => d.patientStats.recovered },
  { id: "chamberDays", label: "Chamber days", value: (d) => (d.chamberDays.length ? formatDays(d.chamberDays) : "") },
  { id: "chamberHours", label: "Chamber hours", value: (d) => formatHours(d.chamberStart, d.chamberEnd) ?? "" },
  { id: "room", label: "Chamber room", value: (d) => d.chamberRoom ?? "" },
  { id: "fee", label: "Fee (BDT)", value: (d) => d.consultationFee ?? "" },
  { id: "registration", label: "BMDC reg.", value: (d) => d.registrationNo ?? "" },
  { id: "joined", label: "Joined", value: (d) => formatDate(d.joinedAt) },
];

/** What a quick (non-custom) export includes: the columns people read most. */
export const DEFAULT_EXPORT_COLUMN_IDS = ["name", "specialization", "hospital", "status", "today", "phone", "experience", "patients", "chamberDays", "chamberHours", "fee"];

/** The API caps a page at 50 rows: fetch page after page until every matching doctor is in. */
export async function fetchAllDoctors(params: DoctorListParams, signal?: AbortSignal): Promise<Doctor[]> {
  const base = doctorQuery({ ...params, page: 1, limit: 50 });
  const first = await clientFetch<Paginated<Doctor>>("/doctors", { searchParams: { ...base, page: 1, limit: 50 }, signal });
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.meta.totalPages - 1) }, (_, i) =>
      clientFetch<Paginated<Doctor>>("/doctors", { searchParams: { ...base, page: i + 2, limit: 50 }, signal }),
    ),
  );
  return [...first.data, ...rest.flatMap((page) => page.data)];
}
