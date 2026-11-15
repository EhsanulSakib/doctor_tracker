"use client";

import { useEffect } from "react";
import { BrandMark } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";

/** Errors outside the app shell (e.g. the sign-in page). Errors inside it use (app)/error.tsx. */
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <BrandMark className="mx-auto" />
        <h1 className="mt-8 text-title font-semibold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-muted">An unexpected error stopped this page from loading. Please try again.</p>
        <Button className="mt-8" onClick={() => retry()}>
          Try again
        </Button>
      </div>
    </main>
  );
}
