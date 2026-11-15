"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "./button";
import { Dialog } from "./dialog";

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
  children,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = async () => {
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
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} loading={pending} onClick={confirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
