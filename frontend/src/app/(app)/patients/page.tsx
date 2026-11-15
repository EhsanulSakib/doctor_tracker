import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PatientsView } from "@/features/patients/components/patients-view";
import { parsePatientParams, patientsHref } from "@/features/patients/params";
import { getDoctorOption, getPatients } from "@/features/patients/server";

export const metadata: Metadata = { title: "Patients" };

/**
 * Server Component: filters from the URL (invalid ones dropped), the page of patients and, for a
 * `?doctorId=` filter, that doctor's name, fetched in parallel. Streams behind loading.tsx.
 */
export default async function PatientsPage({ searchParams }: PageProps<"/patients">) {
  const params = parsePatientParams(await searchParams);
  const [{ data, meta }, doctor] = await Promise.all([getPatients(params), params.doctorId ? getDoctorOption(params.doctorId) : null]);

  // A doctor filter for a doctor that no longer exists: drop it rather than show an unexplained empty list.
  if (params.doctorId && !doctor) redirect(patientsHref("/patients", params, { doctorId: undefined }));
  if (data.length === 0 && meta.total > 0 && params.page > 1) redirect(patientsHref("/patients", params, { page: meta.totalPages }));

  return (
    <>
      <PageHeader title="Patients" />
      <PatientsView patients={data} meta={meta} params={params} doctor={doctor} />
    </>
  );
}
