import "server-only";
import { notFound } from "next/navigation";
import { isApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-fetch";
import type { ApiData, Paginated } from "@/lib/api/types";
import type { DoctorOption } from "@/features/doctors/components/doctor-select";
import type { Doctor } from "@/features/doctors/types";
import { patientQuery, type PatientListParams } from "./params";
import type { Patient } from "./types";

// Reads for the patients page (Server Components only: they forward the session cookie).

export const getPatients = (params: PatientListParams) => serverFetch<Paginated<Patient>>("/patients", { searchParams: patientQuery(params) });

/** One patient for the details page; a missing or malformed id shows the not-found page. */
export async function getPatient(id: string): Promise<Patient> {
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  try {
    return (await serverFetch<ApiData<Patient>>(`/patients/${id}`)).data;
  } catch (error) {
    if (isApiError(error) && (error.status === 404 || error.status === 400)) notFound();
    throw error;
  }
}

/** The doctor behind a `?doctorId=` filter (for its name in the picker and the token); null if it's gone. */
export async function getDoctorOption(id: string): Promise<DoctorOption | null> {
  try {
    const { data } = await serverFetch<ApiData<Doctor>>(`/doctors/${id}`);
    return { id: data.id, name: data.name, specialization: data.specialization };
  } catch (error) {
    if (isApiError(error) && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}
