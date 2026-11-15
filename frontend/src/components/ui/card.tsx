import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** The standard panel: white surface, hairline border, soft shadow, 12px corners. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-panel border border-line bg-surface shadow-card", className)} {...props} />;
}
