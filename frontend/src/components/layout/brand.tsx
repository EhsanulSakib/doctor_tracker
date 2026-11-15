import { useId } from "react";
import { cn } from "@/lib/utils";

/** Logo mark: a pulse line on an indigo → violet tile. `inverted` = white tile (for photos / dark panels). */
export function BrandMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 32 32" aria-hidden focusable={false} className={cn("size-8 shrink-0", className)}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--accent)" }} />
          <stop offset="1" style={{ stopColor: "var(--accent-2)" }} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={inverted ? "#ffffff" : `url(#${gradientId})`} />
      <path
        d="M6.5 17h5l2.5-6 4 11 2.5-5h5"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke={inverted ? `url(#${gradientId})` : "#ffffff"}
      />
    </svg>
  );
}
