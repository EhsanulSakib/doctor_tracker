"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toastMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectToasts, toastDismissed, type Toast, type ToastTone } from "@/store/slices/toast";
import { IconButton } from "./icon-button";
import { AlertCircleIcon, CheckCircleIcon, InfoIcon, XIcon } from "./icons";
import { Portal } from "./portal";

/** Errors stay longer: they usually need reading. Timers pause while hovered or focused. */
const DURATION_MS: Record<ToastTone, number> = { success: 4000, info: 5000, error: 8000 };

const ICONS: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircleIcon size={18} className="mt-px shrink-0 text-success" />,
  error: <AlertCircleIcon size={18} className="mt-px shrink-0 text-danger" />,
  info: <InfoIcon size={18} className="mt-px shrink-0 text-info" />,
};

const announcement = (toast: Toast | undefined) => (toast ? `${toast.title}${toast.description ? `. ${toast.description}` : ""}` : "");

export function Toaster() {
  const toasts = useAppSelector(selectToasts);
  const latest = toasts.at(-1);

  return (
    <Portal>
      {/* Live regions exist before any toast, so screen readers reliably announce new ones. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {latest?.tone !== "error" ? announcement(latest) : ""}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {latest?.tone === "error" ? announcement(latest) : ""}
      </div>

      <section
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-70 flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-0 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} />
          ))}
        </AnimatePresence>
      </section>
    </Portal>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();
  const [paused, setPaused] = useState(false);
  const remaining = useRef(DURATION_MS[toast.tone]);

  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => dispatch(toastDismissed(toast.id)), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt;
    };
  }, [paused, dispatch, toast.id]);

  return (
    <m.div
      layout
      variants={toastMotion}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-panel border border-line bg-surface p-3.5 shadow-overlay",
      )}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {ICONS[toast.tone]}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-ui text-ink-muted">{toast.description}</p>}
      </div>
      <IconButton
        label="Dismiss notification"
        icon={<XIcon size={14} />}
        size="sm"
        className="-m-1 size-7 pointer-coarse:size-9"
        onClick={() => dispatch(toastDismissed(toast.id))}
      />
    </m.div>
  );
}
