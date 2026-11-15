import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "text-ink-muted",
  accent: "text-accent-fg",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

type BadgeProps = {
  tone?: BadgeTone;
  /** Kept for existing call sites; statuses are plain coloured text now (no pill, no dot). */
  dot?: boolean;
  className?: string;
  children: ReactNode;
};

/** A status as coloured text. The word itself carries the meaning, so colour is never the only signal. */
export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return <span className={cn("inline-flex items-center text-xs font-semibold whitespace-nowrap leading-5", tones[tone], className)}>{children}</span>;
}
