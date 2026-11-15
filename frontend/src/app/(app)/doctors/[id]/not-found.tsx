import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StethoscopeIcon } from "@/components/ui/icons";

/** A malformed id, or a doctor that was deleted (an old link or bookmark). */
export default function DoctorNotFound() {
  return (
    <>
      <h1 className="sr-only">Doctor not found</h1>
      <Card>
        <EmptyState
          icon={<StethoscopeIcon size={20} />}
          title="Doctor not found"
          action={
            <Link href="/doctors" className={buttonStyles({ variant: "secondary" })}>
              Back to doctors
            </Link>
          }
        />
      </Card>
    </>
  );
}
