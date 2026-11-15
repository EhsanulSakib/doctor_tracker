"use client";

import { AnimatePresence, m } from "motion/react";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { CalendarIcon, StethoscopeIcon, UsersIcon } from "@/components/ui/icons";
import { EASE_OUT } from "@/lib/motion";
import { cn, formatNumber } from "@/lib/utils";

type TabId = "patients" | "attendance" | "details";

/**
 * The doctor page's sections as tabs, one at a time and full width (so the patient table never needs a
 * sideways scrollbar and the page stays short). The tab survives filter / page changes in the URL.
 */
export function DoctorTabs({ patientCount, patients, attendance, details }: { patientCount: number; patients: ReactNode; attendance: ReactNode; details: ReactNode }) {
  const [active, setActive] = useState<TabId>("patients");
  const baseId = useId();
  const tabs: { id: TabId; label: string; icon: ReactNode; count?: number; panel: ReactNode }[] = [
    { id: "patients", label: "Patients", icon: <UsersIcon size={16} />, count: patientCount, panel: patients },
    { id: "attendance", label: "Attendance", icon: <CalendarIcon size={16} />, panel: attendance },
    { id: "details", label: "Details", icon: <StethoscopeIcon size={16} />, panel: details },
  ];

  // Arrow keys move between tabs (the WAI-ARIA tabs pattern).
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = tabs[(index + delta + tabs.length) % tabs.length]!;
    setActive(next.id);
    document.getElementById(`${baseId}-${next.id}-tab`)?.focus();
  };

  const current = tabs.find((t) => t.id === active)!;

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Doctor sections" className="flex gap-1 overflow-x-auto border-b border-line scrollbar-none">
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`${baseId}-${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "relative flex h-11 shrink-0 cursor-pointer items-center gap-2 px-3.5 text-sm font-medium whitespace-nowrap transition-colors focus-ring",
                selected ? "text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              <span className={selected ? "text-accent-fg" : undefined}>{tab.icon}</span>
              {tab.label}
              {tab.count !== undefined && <span className="text-ui text-ink-subtle tabular-nums">{formatNumber(tab.count)}</span>}
              {selected && <m.span layoutId={`${baseId}-indicator`} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={active}
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-${active}-tab`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
        >
          {current.panel}
        </m.div>
      </AnimatePresence>
    </div>
  );
}
