import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StethoscopeIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Doctors" };

// Placeholder: the doctors list, profile and forms are built in module 4.1.
export default function DoctorsPage() {
  return (
    <>
      <PageHeader title="Doctors" description="Doctors across your hospitals in Bangladesh." />
      <div className="rounded-panel border border-line bg-surface">
        <EmptyState
          icon={<StethoscopeIcon size={20} />}
          title="The doctors list arrives in module 4.1"
          description="Search, filters, pagination, profiles with each doctor's patients, and create / edit / delete."
        />
      </div>
    </>
  );
}
