import { cn } from "@/lib/utils";

/** Logo mark: a pulse line on a teal tile. `inverted` for teal backgrounds. */
export function BrandMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden focusable={false} className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="8" className={inverted ? "fill-accent-ink" : "fill-accent"} />
      <path
        d="M6.5 17h5l2.5-6 4 11 2.5-5h5"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={inverted ? "stroke-accent" : "stroke-accent-ink"}
      />
    </svg>
  );
}
