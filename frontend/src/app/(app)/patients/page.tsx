import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Patients" };

// Placeholder: the patients list and forms are built in module 4.2.
export default function PatientsPage() {
  return (
    <>
      <PageHeader title="Patients" />
      <Card>
        <EmptyState icon={<UsersIcon size={20} />} title="Coming soon" />
      </Card>
    </>
  );
}
