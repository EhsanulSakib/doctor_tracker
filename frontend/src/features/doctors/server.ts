import "server-only";
import { notFound } from "next/navigation";
import { isApiError } from "@/lib/api/errors";
import { serverFetch } from "@/lib/api/server-fetch";
import type { ApiData, Paginated } from "@/lib/api/types";
import { patientQuery, type PatientListParams } from "@/features/patients/params";
import type { Patient } from "@/features/patients/types";
import { doctorQuery, type DoctorListParams } from "./params";
import type { AttendanceHistory, Doctor } from "./types";

// Reads for the doctors pages (Server Components only: they forward the session cookie).

export const getDoctors = (params: DoctorListParams) => serverFetch<Paginated<Doctor>>("/doctors", { searchParams: doctorQuery(params) });

export const getHospitals = async () => (await serverFetch<ApiData<string[]>>("/doctors/hospitals")).data;

const OBJECT_ID = /^[a-f\d]{24}$/i;

/** A malformed id can't be a doctor: show the not-found page without asking the API. */
export function assertDoctorId(id: string) {
  if (!OBJECT_ID.test(id)) notFound();
}

/**
 * The profile loads the doctor, their patients and the counts in parallel; whichever request notices
 * first that the doctor doesn't exist (404) turns into the not-found page, never the error page.
 */
export async function orNotFound<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (isApiError(error) && (error.status === 404 || error.status === 400)) notFound();
    throw error;
  }
}

export async function getDoctor(id: string): Promise<Doctor> {
  assertDoctorId(id);
  return (await orNotFound(serverFetch<ApiData<Doctor>>(`/doctors/${id}`))).data;
}

export const getDoctorPatients = (id: string, params: PatientListParams) =>
  serverFetch<Paginated<Patient>>(`/doctors/${id}/patients`, { searchParams: patientQuery(params) });

/** The last `days` days of attendance (marked days only, newest first). */
export const getDoctorAttendance = async (id: string, days = 126) =>
  (await serverFetch<ApiData<AttendanceHistory>>(`/doctors/${id}/attendance`, { searchParams: { days } })).data;
