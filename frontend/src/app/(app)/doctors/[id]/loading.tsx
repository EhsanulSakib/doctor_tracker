import { DoctorPatientsSkeleton } from "@/features/doctors/components/doctor-patients-view";
import { DoctorProfileSkeleton } from "@/features/doctors/components/doctor-profile";

/** The profile's exact shape while it loads (header card, patient toolbar, table, pagination). */
export default function DoctorLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      <span className="sr-only">Loading doctor…</span>
      <DoctorProfileSkeleton />
      <DoctorPatientsSkeleton />
    </div>
  );
}
