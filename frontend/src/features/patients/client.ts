import { clientFetch } from "@/lib/api/client-fetch";
import type { ApiData } from "@/lib/api/types";
import type { PatientPayload } from "./schema";
import type { Patient } from "./types";

/** `POST /api/doctors/:id/patients`: the doctor comes from the path. */
export const createDoctorPatient = async (doctorId: string, body: PatientPayload) =>
  (await clientFetch<ApiData<Patient>>(`/doctors/${doctorId}/patients`, { method: "POST", body })).data;

export const updatePatient = async (id: string, body: Partial<PatientPayload> & { doctorId?: string }) =>
  (await clientFetch<ApiData<Patient>>(`/patients/${id}`, { method: "PATCH", body })).data;

export const deletePatient = (id: string) => clientFetch<void>(`/patients/${id}`, { method: "DELETE" });
