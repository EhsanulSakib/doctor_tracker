import type { Metadata } from "next";
import { BreadcrumbTail } from "@/components/layout/breadcrumb-tail";
import { getDoctor } from "@/features/doctors/server";
import { PatientDetail } from "@/features/patients/components/patient-detail";
import { getPatient } from "@/features/patients/server";

export const metadata: Metadata = { title: "Patient" };

/** One patient: their record on the left, their doctor (and earlier doctors) on the right. */
export default async function PatientPage({ params }: PageProps<"/patients/[id]">) {
  const { id } = await params;
  const patient = await getPatient(id);
  const doctor = patient.doctor ? await getDoctor(patient.doctor.id).catch(() => null) : null;

  return (
    <>
      <BreadcrumbTail label={patient.name} />
      <PatientDetail patient={patient} doctor={doctor} />
    </>
  );
}
