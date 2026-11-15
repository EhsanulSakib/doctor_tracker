"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <Card>
      <EmptyState
        icon={<AlertTriangleIcon size={20} />}
        title="Couldn't load this page"
        description={
          <>
            Check your connection and try again.
            {digest && <span className="mt-2 block font-mono text-xs text-ink-muted">Reference: {digest}</span>}
          </>
        }
        action={<Button onClick={() => retry()}>Try again</Button>}
      />
    </Card>
  );
}
