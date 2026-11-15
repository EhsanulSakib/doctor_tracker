import { cn } from "@/lib/utils";

type SpinnerProps = {
  size?: number;
  /** Announced to screen readers. Omit when the spinner sits inside something that already says it's busy. */
  label?: string;
  className?: string;
};

export function Spinner({ size = 16, label, className }: SpinnerProps) {
  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("shrink-0 animate-spin", className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );

  if (!label) return svg;
  return (
    <span role="status" className="inline-flex items-center">
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
}
