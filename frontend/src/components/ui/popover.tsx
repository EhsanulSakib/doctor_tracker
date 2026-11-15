"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { useAnchoredPosition } from "@/hooks/use-anchored-position";
import { useDismiss } from "@/hooks/use-dismiss";
import { popIn } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { getFocusable, Portal } from "./portal";

export type PopoverTriggerProps = {
  ref: RefObject<HTMLButtonElement | null>;
  id: string;
  onClick: () => void;
  "aria-expanded": boolean;
  "aria-haspopup": "dialog";
  "aria-controls": string | undefined;
};

type PopoverProps = {
  /** Render the trigger and spread these props onto a button. */
  trigger: (props: PopoverTriggerProps) => ReactNode;
  /** Panel content; the function form gets `close()` (returns focus to the trigger). */
  children: ReactNode | ((api: { close: () => void }) => ReactNode);
  /** Accessible name of the panel. */
  label: string;
  align?: "start" | "end";
  /** Optional control from outside (e.g. reset a draft when it opens). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

/**
 * Non-modal floating panel (filters, date ranges). Opens next to its trigger, moves focus inside,
 * closes on Escape, outside click or tabbing out, and returns focus to the trigger.
 */
export function Popover({ trigger, children, label, align = "start", open: openProp, onOpenChange, className }: PopoverProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const triggerId = useId();

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next);
  };

  // Focuses the trigger by id rather than through the ref: `close` is handed to children during
  // render, and a closure over a ref there would defeat the React Compiler's guarantees.
  const close = () => {
    setOpen(false);
    document.getElementById(triggerId)?.focus();
  };

  useDismiss(open, [triggerRef, panelRef], () => setOpen(false));
  useAnchoredPosition(triggerRef, panelRef, open, { align });

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    (getFocusable(panel)[0] ?? panel)?.focus({ preventScroll: true });
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    // Tabbing out of either end closes the panel and lands back on the trigger, keeping the reading order.
    if (event.key === "Tab") {
      const focusable = getFocusable(panelRef.current);
      const leavingStart = event.shiftKey && document.activeElement === focusable[0];
      const leavingEnd = !event.shiftKey && document.activeElement === focusable.at(-1);
      if (leavingStart || leavingEnd) {
        event.preventDefault();
        close();
      }
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && !panelRef.current?.contains(next) && !triggerRef.current?.contains(next)) setOpen(false);
  };

  return (
    <>
      {trigger({
        ref: triggerRef,
        id: triggerId,
        onClick: () => setOpen(!open),
        "aria-expanded": open,
        "aria-haspopup": "dialog",
        "aria-controls": open ? panelId : undefined,
      })}
      <Portal>
        <AnimatePresence>
          {open && (
            <m.div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label={label}
              tabIndex={-1}
              // Positioned by useAnchoredPosition (writes top/left before paint).
              style={{ top: 0, left: 0, visibility: "hidden" }}
              className={cn(
                "fixed z-60 max-w-[calc(100vw-16px)] rounded-panel border border-line bg-surface p-3 shadow-overlay outline-none",
                className,
              )}
              variants={popIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
            >
              {typeof children === "function" ? children({ close }) : children}
            </m.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}
