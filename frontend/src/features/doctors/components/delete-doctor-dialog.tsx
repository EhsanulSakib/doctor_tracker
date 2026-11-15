"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonStyles } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { refreshNotifications } from "@/features/notifications/types";
import { useToast } from "@/hooks/use-toast";
import { isApiError } from "@/lib/api/errors";
import { formatNumber } from "@/lib/utils";
import { deleteDoctor } from "../client";
import type { Doctor } from "../types";

const patientsText = (count: number) => `${formatNumber(count)} ${count === 1 ? "patient is" : "patients are"}`;

type DeleteDoctorDialogProps = {
  open: boolean;
  onClose: () => void;
  doctor: Doctor | null;
  /** After a successful delete (default: refresh the current page). The profile page goes back to the list. */
  onDeleted?: () => void;
};

/**
 * The API refuses to delete a doctor who still has patients (409 DOCTOR_HAS_PATIENTS). The list
 * already knows the count, so that case gets an explanation up front instead of a doomed request;
 * the 409 is still handled for the race where a patient is added meanwhile.
 */
export function DeleteDoctorDialog({ open, onClose, doctor, onDeleted }: DeleteDoctorDialogProps) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  if (doctor && doctor.patientCount > 0) {
    return (
      <Dialog
        open={open}
        onClose={close}
        size="sm"
        title={`${doctor.name} can't be deleted yet`}
        description={`${patientsText(doctor.patientCount)} assigned to this doctor. Move them to another doctor or delete them first.`}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
            <Link href={`/doctors/${doctor.id}`} onClick={close} className={buttonStyles()}>
              View patients
            </Link>
          </>
        }
      />
    );
  }

  const confirm = async () => {
    if (!doctor) return;
    setError(null);
    try {
      await deleteDoctor(doctor.id);
      toast.success("Doctor deleted", doctor.name);
      refreshNotifications();
      close();
      if (onDeleted) onDeleted();
      else router.refresh();
    } catch (err) {
      if (!isApiError(err)) throw err;
      if (err.code === "DOCTOR_HAS_PATIENTS") {
        const count = (err.details as { patientCount?: number } | undefined)?.patientCount ?? 0;
        setError(`${patientsText(count)} now assigned to this doctor. Move them to another doctor or delete them first.`);
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={close}
      onConfirm={confirm}
      title={doctor ? `Delete ${doctor.name}?` : "Delete doctor?"}
      description="The doctor is removed permanently. This can't be undone."
      confirmLabel="Delete doctor"
    >
      {error && <FormAlert>{error}</FormAlert>}
    </ConfirmDialog>
  );
}
