import { Skeleton } from "@/components/ui/skeleton";

/** Shown inside the shell while a page's data streams in (sidebar and top bar stay interactive). */
export default function AppLoading() {
  return (
    <div role="status" aria-live="polite" className="grid gap-6">
      <span className="sr-only">Loading…</span>
      <div className="grid gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="w-80 max-w-full" />
      </div>
      <div className="grid gap-4 rounded-panel border border-line bg-surface p-5">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className={i % 3 === 0 ? "w-2/3" : "w-full"} />
        ))}
      </div>
    </div>
  );
}
