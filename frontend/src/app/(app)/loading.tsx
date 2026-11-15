import { EmptyCardSkeleton } from "@/components/layout/page-skeleton";

/**
 * Shown inside the shell while a page streams in (sidebar and top bar stay interactive). Shaped like
 * the placeholder pages (one card); pages with their own layout add a matching loading.tsx.
 */
export default function AppLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <EmptyCardSkeleton />
    </div>
  );
}
