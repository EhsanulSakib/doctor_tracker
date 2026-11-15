"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertTriangleIcon } from "@/components/ui/icons";

/** A page failed to load (API down, unexpected error). The shell stays usable; "Try again" re-fetches. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Server errors arrive with only a digest (details stay in the server logs).
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <div className="rounded-panel border border-line bg-surface">
      <EmptyState
        icon={<AlertTriangleIcon size={20} />}
        title="This page couldn't load"
        description={
          <>
            The server didn&apos;t respond as expected. Check your connection and try again.
            {digest && <span className="mt-2 block font-mono text-xs text-ink-subtle">Reference: {digest}</span>}
          </>
        }
        action={<Button onClick={() => retry()}>Try again</Button>}
      />
    </div>
  );
}
