"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "./icons";

/** Copies `value` to the clipboard; the icon turns into a check for a moment. */
export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy", "Copy it manually instead.");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      data-tooltip={copied ? "Copied" : label}
      className={cn(
        "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-subtle transition-colors hover:bg-paper-2 hover:text-ink focus-ring pointer-coarse:size-9",
        copied && "text-success hover:text-success",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={copied ? "check" : "copy"}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.12 }}
          className="flex"
        >
          {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
        </m.span>
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
