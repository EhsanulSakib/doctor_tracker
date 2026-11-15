"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Input } from "./input";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  /** May be async: the confirm button shows a spinner and the dialog can't be dismissed until it settles. */
  onConfirm: () => unknown;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  /** When set, the confirm button stays disabled until this exact text (e.g. the record's name) is typed. */
  confirmText?: string;
  /** Extra content, e.g. an error message from a failed attempt. */
  children?: ReactNode;
};

/**
 * "Are you sure?" for destructive actions. Focus starts on Cancel, so pressing Enter by reflex
 * doesn't delete anything. The caller closes it on success and keeps it open (with a message) on error.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "danger",
  confirmText,
  children,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [typed, setTyped] = useState("");
  const inputId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Start empty every time the dialog opens (state adjusted during render, not in an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTyped("");
  }

  const matches = !confirmText || typed.trim().toLowerCase() === confirmText.trim().toLowerCase();

  const confirm = async () => {
    if (!matches) return;
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      dismissible={!pending}
      initialFocusRef={confirmText ? inputRef : cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={pending} disabled={!matches} onClick={confirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {confirmText && (
        <div className="grid gap-2">
          <label htmlFor={inputId} className="text-ui text-ink-muted">
            Type <span className="font-semibold text-ink select-all">{confirmText}</span> to confirm
          </label>
          <Input
            ref={inputRef}
            id={inputId}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void confirm();
              }
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder={confirmText}
            disabled={pending}
            aria-invalid={typed.length > 0 && !matches ? true : undefined}
          />
        </div>
      )}
      {children}
    </Dialog>
  );
}
