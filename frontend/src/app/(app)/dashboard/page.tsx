import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder: the analytics dashboard is built in module 4.3.
export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Clinic activity at a glance." />
      <div className="rounded-panel border border-line bg-surface">
        <EmptyState
          icon={<DashboardIcon size={20} />}
          title="Analytics arrive in module 4.3"
          description="KPIs, admissions over time, top doctors and condition breakdowns from the dashboard API."
        />
      </div>
    </>
  );
}
