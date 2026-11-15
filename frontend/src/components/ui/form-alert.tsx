import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertCircleIcon } from "./icons";

/** A form-level error (not tied to one field), announced as soon as it appears. */
export function FormAlert({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("flex items-start gap-2.5 rounded-control border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger", className)}>
      <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
