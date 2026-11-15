import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { DoctorsView } from "@/features/doctors/components/doctors-view";
import { doctorsHref, parseDoctorParams } from "@/features/doctors/params";
import { getDoctors, getHospitals } from "@/features/doctors/server";

export const metadata: Metadata = { title: "Doctors" };

/**
 * Server Component: reads the filters from the URL (invalid ones dropped), fetches the page of doctors
 * and the hospital list in parallel, and hands plain data to the client view. Streams behind loading.tsx.
 */
export default async function DoctorsPage({ searchParams }: PageProps<"/doctors">) {
  const params = parseDoctorParams(await searchParams);
  const [{ data, meta }, hospitals] = await Promise.all([getDoctors(params), getHospitals()]);

  // A page past the end (e.g. the last row on the last page was deleted): show the last real page.
  if (data.length === 0 && meta.total > 0 && params.page > 1) redirect(doctorsHref(params, { page: meta.totalPages }));

  return (
    <>
      <PageHeader title="Doctors" />
      <DoctorsView doctors={data} meta={meta} params={params} hospitals={hospitals} />
    </>
  );
}
