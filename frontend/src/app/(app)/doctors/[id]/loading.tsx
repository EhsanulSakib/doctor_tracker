import { Skeleton } from "@/components/ui/skeleton";
import { DoctorPatientsSkeleton } from "@/features/doctors/components/doctor-patients-view";
import { DoctorHeaderSkeleton } from "@/features/doctors/components/doctor-profile";

/** The profile's shape while it loads: header, tab bar, then the patients tab. */
export default function DoctorLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Loading doctor…</span>
      <DoctorHeaderSkeleton />
      <div className="flex h-11 items-center gap-6 border-b border-line px-3.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <DoctorPatientsSkeleton />
    </div>
  );
}
