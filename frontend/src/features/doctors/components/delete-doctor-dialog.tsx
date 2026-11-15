"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { refreshNotifications } from "@/features/notifications/types";
import { useToast } from "@/hooks/use-toast";
import { isApiError, isReadOnlyError } from "@/lib/api/errors";
import { formatNumber } from "@/lib/utils";
import { deleteDoctor } from "../client";
import type { Doctor } from "../types";

type DeleteDoctorDialogProps = {
  open: boolean;
  onClose: () => void;
  doctor: Doctor | null;
  /** After a successful delete (default: refresh the current page). The profile page goes back to the list. */
  onDeleted?: () => void;
};

const patients = (n: number) => `${formatNumber(n)} ${n === 1 ? "patient" : "patients"}`;

/**
 * Permanent delete, confirmed by typing the doctor's name. The doctor's patients stay in the system with
 * no doctor ("N/A") until someone assigns them to another doctor.
 */
export function DeleteDoctorDialog({ open, onClose, doctor, onDeleted }: DeleteDoctorDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!doctor) return;
    setError(null);
    try {
      const { unassigned } = await deleteDoctor(doctor.id);
      toast.success("Doctor deleted", unassigned ? `${patients(unassigned)} now without a doctor` : doctor.name);
      refreshNotifications();
      close();
      if (onDeleted) onDeleted();
      else router.refresh();
    } catch (err) {
      if (!isApiError(err)) throw err;
      if (isReadOnlyError(err)) return; // shown as a toast
      setError(err.message);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={close}
      onConfirm={confirm}
      title={doctor ? `Delete ${doctor.name}?` : "Delete doctor?"}
      description={
        doctor && doctor.patientCount > 0
          ? `This can't be undone. Their ${patients(doctor.patientCount)} stay, with the doctor shown as N/A until you assign another one.`
          : "This can't be undone."
      }
      confirmLabel="Delete doctor"
      confirmText={doctor?.name}
    >
      {error && <FormAlert>{error}</FormAlert>}
    </ConfirmDialog>
  );
}
