import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Patients" };

// Placeholder: the patients list and forms are built in module 4.2.
export default function PatientsPage() {
  return (
    <>
      <PageHeader title="Patients" description="Every patient and the doctor responsible for them." />
      <div className="rounded-panel border border-line bg-surface">
        <EmptyState
          icon={<UsersIcon size={20} />}
          title="The patients list arrives in module 4.2"
          description="Search, condition / status / date filters, pagination, edit with doctor reassignment, and delete."
        />
      </div>
    </>
  );
}
