import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { InboxIcon } from "./icons";

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  /** Usually a button: "Add doctor", "Clear filters". */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-fg ring-8 ring-accent-soft/40">
        {icon ?? <InboxIcon size={20} />}
      </div>
      <h3 className="text-lead font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
