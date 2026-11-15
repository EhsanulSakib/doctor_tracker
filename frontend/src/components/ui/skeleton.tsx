import { cn } from "@/lib/utils";

/** Placeholder block shaped like the content that's loading (reserves space: no layout shift). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("h-4 rounded-control bg-line/70 motion-safe:animate-pulse", className)} />;
}
