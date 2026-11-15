"use client";

import { m } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { CalendarIcon, ChevronRightIcon, ClockIcon, MailIcon, PencilIcon, PhoneIcon, StethoscopeIcon, TrashIcon, UsersIcon } from "@/components/ui/icons";
import { availabilityOf, formatDays, formatHours } from "@/features/doctors/availability";
import type { Doctor } from "@/features/doctors/types";
import { useNow } from "@/hooks/use-now";
import { GENDER_LABELS, PATIENT_STATUS_LABELS, PATIENT_STATUS_TONES } from "@/lib/constants";
import { EASE_OUT } from "@/lib/motion";
import { cn, formatDate } from "@/lib/utils";
import type { Patient } from "../types";
import { DeletePatientDialog } from "./delete-patient-dialog";
import { PatientFormDialog } from "./patient-form-dialog";

const rise = (index: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: EASE_OUT, delay: index * 0.07 },
});

const TONE_TEXT: Record<string, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-ink-muted",
  accent: "text-accent-fg",
};

/** The patient's page: the record on the left; their doctor (with today's availability) on the right. */
export function PatientDetail({ patient, doctor }: { patient: Patient; doctor: Doctor | null }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <m.div {...rise(0)}>
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar name={patient.name} size={56} />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl leading-7 font-semibold tracking-tight text-ink">{patient.name}</h1>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-ink-muted">
                  <span>{patient.condition}</span>
                  <span aria-hidden className="text-line-strong">
                    ·
                  </span>
                  <Badge tone={PATIENT_STATUS_TONES[patient.status]} className="text-sm">
                    {PATIENT_STATUS_LABELS[patient.status]}
                  </Badge>
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon={<PencilIcon />} onClick={() => setDialog("edit")}>
                  Edit
                </Button>
                <Button size="sm" variant="secondary" icon={<TrashIcon />} onClick={() => setDialog("delete")} className="text-danger hover:text-danger">
                  Delete
                </Button>
              </div>
            </div>

            <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-line pt-5 text-ui sm:grid-cols-2">
              <Item icon={<UsersIcon size={15} />} label="Age">
                {patient.age} years
              </Item>
              <Item icon={<UsersIcon size={15} />} label="Gender">
                {GENDER_LABELS[patient.gender]}
              </Item>
              <Item icon={<PhoneIcon size={15} />} label="Phone" copy={patient.phone}>
                <a href={`tel:${patient.phone.replace(/[^\d+]/g, "")}`} className="rounded-sm tabular-nums hover:text-accent-fg focus-ring">
                  {patient.phone}
                </a>
              </Item>
              <Item icon={<MailIcon size={15} />} label="Email" copy={patient.email ?? undefined}>
                {patient.email ? (
                  <a href={`mailto:${patient.email}`} className="block truncate rounded-sm hover:text-accent-fg focus-ring">
                    {patient.email}
                  </a>
                ) : (
                  <span className="font-normal text-ink-subtle">Not set</span>
                )}
              </Item>
              <Item icon={<StethoscopeIcon size={15} />} label="Condition">
                {patient.condition}
              </Item>
              <Item icon={<CalendarIcon size={15} />} label="Admitted">
                {formatDate(patient.admissionDate)}
              </Item>
            </dl>

            <div className="mt-5 border-t border-line pt-4">
              <p className="text-caption text-ink-muted">Notes</p>
              <p className={cn("mt-1 text-sm leading-6 whitespace-pre-line", patient.notes ? "text-ink" : "text-ink-subtle")}>{patient.notes ?? "No notes"}</p>
            </div>
          </Card>
        </m.div>
      </div>

      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-0">
        <m.div {...rise(1)}>
          <DoctorCard patient={patient} doctor={doctor} />
        </m.div>
      </div>

      <PatientFormDialog open={dialog === "edit"} onClose={() => setDialog(null)} patient={patient} />
      <DeletePatientDialog open={dialog === "delete"} onClose={() => setDialog(null)} patient={patient} onDeleted={() => router.replace("/patients")} />
    </div>
  );
}

function DoctorCard({ patient, doctor }: { patient: Patient; doctor: Doctor | null }) {
  const now = useNow("minute");

  if (!doctor || !patient.doctor) {
    return (
      <Card className="p-4 sm:p-5">
        <h2 className="text-base font-semibold tracking-tight text-ink">Doctor</h2>
        <p className="mt-2 text-sm font-medium text-ink-subtle">N/A</p>
        <p className="mt-1 text-ui text-ink-muted">Edit the patient to assign a doctor.</p>
      </Card>
    );
  }

  const today = availabilityOf(doctor, now);
  const hours = formatHours(doctor.chamberStart, doctor.chamberEnd);

  return (
    <Card className="overflow-hidden">
      <div className="p-4 sm:p-5">
        <h2 className="text-base font-semibold tracking-tight text-ink">Doctor</h2>
        <Link href={`/doctors/${doctor.id}`} className="group mt-3 flex items-center gap-3 rounded-control focus-ring">
          <Avatar name={doctor.name} src={doctor.photoUrl} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink group-hover:text-accent-fg">{doctor.name}</p>
            <p className="truncate text-ui text-ink-muted">
              <span className="text-accent-fg">{doctor.specialization}</span> · {doctor.hospital}
            </p>
          </div>
          <ChevronRightIcon className="shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <dl className="grid gap-3 border-t border-line px-4 py-4 text-ui sm:px-5">
        <Item icon={<ClockIcon size={15} />} label="Today">
          <span className={cn("font-semibold", TONE_TEXT[today.tone])}>{today.label}</span>
        </Item>
        <Item icon={<CalendarIcon size={15} />} label="Chamber">
          {doctor.chamberDays.length ? formatDays(doctor.chamberDays) : "No days set"}
          {hours && <span className="font-normal text-ink-muted"> · {hours}</span>}
        </Item>
        <Item icon={<PhoneIcon size={15} />} label="Phone" copy={doctor.phone}>
          <span className="tabular-nums">{doctor.phone}</span>
        </Item>
      </dl>
    </Card>
  );
}

function Item({ icon, label, copy, children }: { icon: ReactNode; label: string; copy?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span aria-hidden className="mt-0.5 text-ink-subtle">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-caption text-ink-muted">{label}</dt>
        <dd className="mt-0.5 flex min-w-0 items-center gap-1 font-medium text-ink">
          <span className="min-w-0 truncate">{children}</span>
          {copy && <CopyButton value={copy} label={`Copy ${label.toLowerCase()}`} className="-my-1.5" />}
        </dd>
      </div>
    </div>
  );
}
