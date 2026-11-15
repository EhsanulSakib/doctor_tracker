import { clientFetch } from "@/lib/api/client-fetch";
import type { ApiData } from "@/lib/api/types";
import type { DoctorPayload } from "./schema";
import type { DeleteDoctorResult, Doctor } from "./types";

// Writes from the browser (same-origin /api; the session cookie rides along).

export const createDoctor = async (body: DoctorPayload) => (await clientFetch<ApiData<Doctor>>("/doctors", { method: "POST", body })).data;

export const updateDoctor = async (id: string, body: Partial<DoctorPayload>) =>
  (await clientFetch<ApiData<Doctor>>(`/doctors/${id}`, { method: "PATCH", body })).data;

/** Deletes the doctor; their patients stay, without a doctor. Returns how many that left unassigned. */
export const deleteDoctor = async (id: string) => (await clientFetch<ApiData<DeleteDoctorResult>>(`/doctors/${id}`, { method: "DELETE" })).data;
