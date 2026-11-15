import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-view";

/** First visit: the dashboard's exact layout while the numbers load (range switches keep the old numbers, dimmed). */
export default function DashboardLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col lg:min-h-0 lg:flex-1">
      <span className="sr-only">Loading dashboard…</span>
      <DashboardSkeleton />
    </div>
  );
}
