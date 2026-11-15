"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * URL-as-state navigation for list pages: replaces the URL (no new history entry per keystroke or
 * filter, no scroll jump) inside a transition, so the current page stays on screen until the server
 * has rendered the new one. `isPending` is true meanwhile (dim the table with it).
 */
export function useNavigateTransition() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const navigate = (href: string) => startTransition(() => router.replace(href, { scroll: false }));
  return [isPending, navigate] as const;
}
