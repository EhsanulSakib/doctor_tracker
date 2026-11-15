"use client";

import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { DOCTOR_COLUMNS } from "./doctors-view";

const noActions = () => null;

/**
 * Same layout as <DoctorsView>: toolbar (36px controls), the real table in loading mode (same columns,
 * so the same header and 60px rows), and the pagination row. Default page size: 10 rows.
 */
export function DoctorsListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 min-w-0 flex-1 pointer-coarse:h-11 sm:max-w-80" />
        <Skeleton className="hidden h-9 w-48 xl:block" />
        <Skeleton className="hidden h-9 w-40 xl:block" />
        <Skeleton className="h-9 w-11 pointer-coarse:h-11 sm:w-24" />
        <Skeleton className="ml-auto h-9 w-11 pointer-coarse:h-11 sm:w-32" />
      </div>
      <div className="flex min-h-0 flex-col">
        <DataTable fill loading cardsBelow="lg" skeletonRows={10} columns={DOCTOR_COLUMNS} rows={[]} getRowId={() => ""} caption="Doctors" rowActions={noActions} />
      </div>
      <div className="flex shrink-0 flex-col-reverse items-center justify-between gap-3 sm:flex-row">
        <Skeleton className="h-8 w-60 pointer-coarse:h-10" />
        <Skeleton className="h-8 w-40 pointer-coarse:h-10" />
      </div>
    </div>
  );
}
