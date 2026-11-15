import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BreadcrumbTail } from "@/components/layout/breadcrumb-tail";
import { AttendancePanel } from "@/features/doctors/components/attendance-calendar";
import { DoctorPatientsView } from "@/features/doctors/components/doctor-patients-view";
import { DoctorDetails, DoctorHeader } from "@/features/doctors/components/doctor-profile";
import { DoctorTabs } from "@/features/doctors/components/doctor-tabs";
import { assertDoctorId, getDoctor, getDoctorAttendance, getDoctorPatients, getHospitals, orNotFound } from "@/features/doctors/server";
import { parsePatientParams, patientsHref } from "@/features/patients/params";

export const metadata: Metadata = { title: "Doctor profile" };

/**
 * Doctor profile: a compact header (who, today, contact, chamber), then tabs for Patients, Attendance
 * and Details, each full width. Patient filters and paging live in the URL
 * (`/doctors/:id?status=recovered&page=2`). Everything loads in parallel.
 */
export default async function DoctorPage({ params, searchParams }: PageProps<"/doctors/[id]">) {
  const { id } = await params;
  assertDoctorId(id);
  const patientParams = parsePatientParams(await searchParams);

  const [doctor, { data: patients, meta }, attendance, hospitals] = await Promise.all([
    getDoctor(id),
    orNotFound(getDoctorPatients(id, patientParams)),
    orNotFound(getDoctorAttendance(id)),
    getHospitals(),
  ]);

  const basePath = `/doctors/${id}`;
  if (patients.length === 0 && meta.total > 0 && patientParams.page > 1) redirect(patientsHref(basePath, patientParams, { page: meta.totalPages }));

  return (
    <div className="flex flex-col gap-4">
      <BreadcrumbTail label={doctor.name} />
      <DoctorHeader doctor={doctor} hospitals={hospitals} />
      <DoctorTabs
        patientCount={doctor.patientCount}
        patients={<DoctorPatientsView doctor={doctor} patients={patients} meta={meta} params={patientParams} />}
        attendance={<AttendancePanel doctor={doctor} attendance={attendance} />}
        details={<DoctorDetails doctor={doctor} />}
      />
    </div>
  );
}
