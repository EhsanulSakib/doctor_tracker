import { DoctorsListSkeleton } from "@/features/doctors/components/doctors-skeleton";

/** First visit to /doctors: the list's exact shape while the data streams in (later filter changes keep the old rows instead). */
export default function DoctorsLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col lg:min-h-0 lg:flex-1">
      <span className="sr-only">Loading doctors…</span>
      <DoctorsListSkeleton />
    </div>
  );
}
