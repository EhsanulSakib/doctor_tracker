"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { fade, transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { lockApp, trapTab, unlockApp } from "./modal";
import { Portal } from "./portal";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible name, e.g. "Navigation". */
  label: string;
  children: ReactNode;
  className?: string;
};

/** Modal panel sliding in from the left (mobile navigation). Same focus/inert/scroll rules as Dialog. */
export function Drawer(props: DrawerProps) {
  return (
    <Portal>
      <AnimatePresence>{props.open && <DrawerContent {...props} />}</AnimatePresence>
    </Portal>
  );
}

function DrawerContent({ onClose, label, children, className }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockApp();
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      unlockApp();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    } else if (event.key === "Tab") {
      trapTab(event, panelRef.current);
    }
  };

  return (
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      <m.div aria-hidden className="absolute inset-0 bg-overlay" variants={fade} initial="hidden" animate="visible" exit="exit" onClick={onClose} />
      <m.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col border-r border-line bg-surface shadow-overlay outline-none",
          className,
        )}
        initial={{ x: "-100%" }}
        animate={{ x: 0, transition: transitions.slow }}
        exit={{ x: "-100%", transition: transitions.exit }}
      >
        {children}
      </m.div>
    </div>
  );
}
