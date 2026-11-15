import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BreadcrumbTail } from "@/components/layout/breadcrumb-tail";
import { DoctorPatientsView } from "@/features/doctors/components/doctor-patients-view";
import { DoctorProfile } from "@/features/doctors/components/doctor-profile";
import { assertDoctorId, getDoctor, getDoctorPatientCounts, getDoctorPatients, getHospitals, orNotFound } from "@/features/doctors/server";
import { parsePatientParams, patientsHref } from "@/features/patients/params";

export const metadata: Metadata = { title: "Doctor profile" };

/**
 * Doctor profile: header with contact details and patient counts, then the doctor's own patient table
 * (filters and paging in the URL: `/doctors/:id?status=recovered&page=2`). Everything loads in parallel.
 */
export default async function DoctorPage({ params, searchParams }: PageProps<"/doctors/[id]">) {
  const { id } = await params;
  assertDoctorId(id);
  const patientParams = parsePatientParams(await searchParams);

  const [doctor, { data: patients, meta }, counts, hospitals] = await Promise.all([
    getDoctor(id),
    orNotFound(getDoctorPatients(id, patientParams)),
    orNotFound(getDoctorPatientCounts(id)),
    getHospitals(),
  ]);

  const basePath = `/doctors/${id}`;
  if (patients.length === 0 && meta.total > 0 && patientParams.page > 1) redirect(patientsHref(basePath, patientParams, { page: meta.totalPages }));

  return (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      <BreadcrumbTail label={doctor.name} />
      <DoctorProfile doctor={doctor} counts={counts} hospitals={hospitals} />
      <DoctorPatientsView doctor={{ id: doctor.id, name: doctor.name }} patients={patients} meta={meta} params={patientParams} />
    </div>
  );
}
