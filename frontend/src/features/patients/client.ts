import { clientFetch } from "@/lib/api/client-fetch";
import type { ApiData } from "@/lib/api/types";
import type { PatientFields } from "./schema";
import type { Patient } from "./types";

/** `POST /api/patients` (patients page: the doctor is picked in the form). */
export const createPatient = async (body: PatientFields & { doctorId: string }) =>
  (await clientFetch<ApiData<Patient>>("/patients", { method: "POST", body })).data;

/** `POST /api/doctors/:id/patients`: the doctor comes from the path. */
export const createDoctorPatient = async (doctorId: string, body: PatientFields) =>
  (await clientFetch<ApiData<Patient>>(`/doctors/${doctorId}/patients`, { method: "POST", body })).data;

export const updatePatient = async (id: string, body: Partial<PatientFields> & { doctorId?: string }) =>
  (await clientFetch<ApiData<Patient>>(`/patients/${id}`, { method: "PATCH", body })).data;

export const deletePatient = (id: string) => clientFetch<void>(`/patients/${id}`, { method: "DELETE" });
