import { Spinner } from "@/components/ui/spinner";

/** Fallback outside the app shell (inside it, (app)/loading.tsx shows page skeletons). */
export default function RootLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-ink-muted">
      <Spinner size={22} label="Loading" />
    </div>
  );
}
