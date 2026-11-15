"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { refreshNotifications } from "@/features/notifications/types";
import { useToast } from "@/hooks/use-toast";
import { isApiError } from "@/lib/api/errors";
import { deletePatient } from "../client";
import type { Patient } from "../types";

/** Hard delete (the API keeps no history), so it always asks first. */
export function DeletePatientDialog({ open, onClose, patient }: { open: boolean; onClose: () => void; patient: Patient | null }) {
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
      description="The patient record is removed permanently. This can't be undone."
      confirmLabel="Delete patient"
      onConfirm={async () => {
        if (!patient) return;
        setError(null);
        try {
          await deletePatient(patient.id);
          toast.success("Patient deleted", patient.name);
          refreshNotifications();
          close();
          router.refresh();
        } catch (err) {
          if (!isApiError(err)) throw err;
          setError(err.message);
        }
      }}
    >
      {error && <FormAlert>{error}</FormAlert>}
    </ConfirmDialog>
  );
}
