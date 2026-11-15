import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientLoading() {
  return (
    <div role="status" aria-live="polite" className="grid items-start gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <span className="sr-only">Loading patient…</span>
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-2 h-3.5 w-32" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="mt-2 h-3.5 w-36" />
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <Skeleton className="h-4 w-24" />
        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </Card>
    </div>
  );
}
