import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholders cut to the exact geometry of the real components, so nothing moves when the
 * content replaces them (no layout shift). Pages have no visible title (it's in the top bar), so a
 * placeholder starts where the page's first block starts. Keep these in sync with what they stand for.
 */

/** Same box as <Card><EmptyState title /></Card>: 48px icon, 16px gap, 22.5px title line, 48px padding top and bottom. */
export function EmptyCardSkeleton() {
  return (
    <Card>
      <div className="flex flex-col items-center px-6 py-12">
        <Skeleton className="mb-4 size-12 rounded-full" />
        <div className="flex h-[22.5px] items-center">
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
    </Card>
  );
}
