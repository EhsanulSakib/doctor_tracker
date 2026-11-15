"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { below } from "@/lib/breakpoints";
import { fade, popIn, sheetUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { IconButton } from "./icon-button";
import { XIcon } from "./icons";
import { lockApp, trapTab, unlockApp } from "./modal";
import { getFocusable, Portal } from "./portal";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Scrollable body. */
  children?: ReactNode;
  /** Action buttons. A submit button here can target a form in the body with `form="<form id>"`. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Set false while saving: Escape, the backdrop and the close button stop closing it. */
  dismissible?: boolean;
  /** Focused on open; defaults to the first field/button in the body, then the dialog itself. */
  initialFocusRef?: RefObject<HTMLElement | null>;
};

const sizes = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" };

/** Modal dialog: bottom sheet on phones, centered panel from `sm`. */
export function Dialog(props: DialogProps) {
  return (
    <Portal>
      <AnimatePresence>{props.open && <DialogContent {...props} />}</AnimatePresence>
    </Portal>
  );
}

function DialogContent({ onClose, title, description, children, footer, size = "md", dismissible = true, initialFocusRef }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Below sm the dialog is a bottom sheet: it slides up instead of popping in.
  const phone = useMediaQuery(below("sm"));
  const titleId = useId();
  const descriptionId = useId();

  // Mount = opened: lock the app and move focus in. Unmount (after the exit animation): unlock and
  // give focus back to whatever opened the dialog.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockApp();
    // On touch screens, focusing a text field would pop the keyboard over half the sheet: focus the
    // dialog itself instead (screen readers still land inside it).
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const target = initialFocusRef?.current ?? (touch ? null : getFocusable(bodyRef.current)[0]) ?? panelRef.current;
    target?.focus({ preventScroll: true });

    return () => {
      unlockApp();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [initialFocusRef]);

  // React events bubble through portals, so an open Select/Popover inside handles Escape first and
  // stops it; only an unhandled Escape reaches here.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (dismissible) onClose();
      return;
    }
    if (event.key === "Tab") trapTab(event, panelRef.current);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" onKeyDown={handleKeyDown}>
      <m.div
        aria-hidden
        className="absolute inset-0 bg-overlay"
        variants={fade}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={dismissible ? onClose : undefined}
      />
      <m.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-panel border border-line bg-surface shadow-overlay outline-none sm:rounded-panel",
          sizes[size],
        )}
        variants={phone ? sheetUp : popIn}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Bottom-sheet handle on phones (decorative: Escape, the backdrop and the close button dismiss it). */}
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" />
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 pt-3 pb-4 sm:pt-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close" icon={<XIcon size={18} />} size="sm" onClick={onClose} disabled={!dismissible} className="-mr-2 -mt-1" />
        </header>

        {children && (
          <div ref={bodyRef} className="overflow-y-auto px-5 py-4">
            {children}
          </div>
        )}

        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:pb-3">
            {footer}
          </footer>
        )}
      </m.div>
    </div>
  );
}
