import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DashboardIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Dashboard" };

// Placeholder: the analytics dashboard is built in module 4.3.
export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <Card>
        <EmptyState icon={<DashboardIcon size={20} />} title="Coming soon" />
      </Card>
    </>
  );
}
