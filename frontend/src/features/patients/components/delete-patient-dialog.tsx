"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { refreshNotifications } from "@/features/notifications/types";
import { useToast } from "@/hooks/use-toast";
import { isApiError, isReadOnlyError } from "@/lib/api/errors";
import { deletePatient } from "../client";
import type { Patient } from "../types";

/** Permanent delete, so it always asks first. `onDeleted` replaces the default refresh. */
export function DeletePatientDialog({ open, onClose, patient, onDeleted }: { open: boolean; onClose: () => void; patient: Patient | null; onDeleted?: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={close}
      title={patient ? `Delete ${patient.name}?` : "Delete patient?"}
      description="This can't be undone."
      confirmLabel="Delete patient"
      onConfirm={async () => {
        if (!patient) return;
        setError(null);
        try {
          await deletePatient(patient.id);
          toast.success("Patient deleted", patient.name);
          refreshNotifications();
          close();
          if (onDeleted) onDeleted();
          else router.refresh();
        } catch (err) {
          if (!isApiError(err)) throw err;
          if (isReadOnlyError(err)) return; // shown as a toast
          setError(err.message);
        }
      }}
    >
      {error && <FormAlert>{error}</FormAlert>}
    </ConfirmDialog>
  );
}
