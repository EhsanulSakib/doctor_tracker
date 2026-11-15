import { PatientsListSkeleton } from "@/features/patients/components/patients-view";

/** First visit to /patients: the list's exact shape while the data streams in. */
export default function PatientsLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col">
      <span className="sr-only">Loading patients…</span>
      <PatientsListSkeleton />
    </div>
  );
}
