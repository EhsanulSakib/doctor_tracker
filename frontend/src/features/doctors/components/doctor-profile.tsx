"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalendarIcon, MailIcon, PencilIcon, PhoneIcon, StethoscopeIcon, TrashIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { DOCTOR_STATUS_LABELS, DOCTOR_STATUS_TONES, type PatientStatus } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/utils";
import { doctorInitials, type Doctor } from "../types";
import { DeleteDoctorDialog } from "./delete-doctor-dialog";
import { DoctorFormDialog } from "./doctor-form-dialog";

type DoctorProfileProps = { doctor: Doctor; counts: Record<PatientStatus, number>; hospitals: string[] };

/** Profile header: who the doctor is, how to reach them, their patient numbers, and edit / delete. */
export function DoctorProfile({ doctor, counts, hospitals }: DoctorProfileProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const stats = [
    { label: "Patients", value: doctor.patientCount },
    { label: "Active", value: counts.active },
    { label: "Under treatment", value: counts.under_treatment },
    { label: "Recovered", value: counts.recovered },
  ];

  return (
    <Card className="shrink-0 overflow-hidden">
      <div className="flex flex-wrap items-start gap-4 p-4 sm:flex-nowrap sm:p-5">
        <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg font-semibold text-accent-fg">
          {doctorInitials(doctor.name)}
        </span>
        <div className="min-w-0 flex-1 basis-[calc(100%-4.5rem)] sm:basis-auto">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-lg leading-7 font-semibold tracking-tight text-ink">{doctor.name}</h1>
            <Badge tone={DOCTOR_STATUS_TONES[doctor.status]} dot>
              {DOCTOR_STATUS_LABELS[doctor.status]}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm leading-5 text-ink-muted">
            {doctor.specialization} · {doctor.hospital}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[13px] leading-5 text-ink">
            <div className="flex min-w-0 items-center gap-1.5">
              <dt className="text-ink-muted">
                <PhoneIcon />
                <span className="sr-only">Phone</span>
              </dt>
              <dd>
                <a href={`tel:${doctor.phone.replace(/[^\d+]/g, "")}`} className="rounded-sm tabular-nums hover:text-accent-fg focus-ring">
                  {doctor.phone}
                </a>
              </dd>
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <dt className="text-ink-muted">
                <MailIcon />
                <span className="sr-only">Email</span>
              </dt>
              <dd className="min-w-0 truncate">
                <a href={`mailto:${doctor.email}`} className="rounded-sm hover:text-accent-fg focus-ring">
                  {doctor.email}
                </a>
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="text-ink-muted">
                <StethoscopeIcon />
                <span className="sr-only">Experience</span>
              </dt>
              <dd>
                {doctor.yearsOfExperience} {doctor.yearsOfExperience === 1 ? "year" : "years"} of experience
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="text-ink-muted">
                <CalendarIcon />
                <span className="sr-only">Joined</span>
              </dt>
              <dd>Joined {formatDate(doctor.joinedAt)}</dd>
            </div>
          </dl>
        </div>
        <div className="flex shrink-0 gap-2 max-sm:basis-full">
          <Button variant="secondary" icon={<PencilIcon />} onClick={() => setDialog("edit")}>
            Edit
          </Button>
          <Button variant="secondary" icon={<TrashIcon />} onClick={() => setDialog("delete")} className="text-danger hover:text-danger">
            Delete
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface px-4 py-3 sm:px-5">
            <dt className="text-label text-ink-muted uppercase">{stat.label}</dt>
            <dd className="mt-1 text-xl leading-7 font-semibold text-ink tabular-nums">{formatNumber(stat.value)}</dd>
          </div>
        ))}
      </dl>

      <DoctorFormDialog open={dialog === "edit"} onClose={() => setDialog(null)} doctor={doctor} hospitals={hospitals} />
      <DeleteDoctorDialog open={dialog === "delete"} onClose={() => setDialog(null)} doctor={doctor} onDeleted={() => router.replace("/doctors")} />
    </Card>
  );
}

/** Same boxes as <DoctorProfile> (56px avatar, 28 / 20 / 20px lines, 36px buttons, 72px stat tiles). */
export function DoctorProfileSkeleton() {
  return (
    <Card className="shrink-0 overflow-hidden">
      <div className="flex flex-wrap items-start gap-4 p-4 sm:flex-nowrap sm:p-5">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 basis-[calc(100%-4.5rem)] sm:basis-auto">
          <div className="flex h-7 items-center gap-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="mt-0.5 flex h-5 items-center">
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
          <div className="mt-3 flex h-5 flex-wrap items-center gap-x-6">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="hidden h-3.5 w-40 sm:block" />
          </div>
        </div>
        <div className="flex shrink-0 gap-2 max-sm:basis-full">
          <Skeleton className="h-9 w-20 pointer-coarse:h-11" />
          <Skeleton className="h-9 w-24 pointer-coarse:h-11" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-surface px-4 py-3 sm:px-5">
            <div className="flex h-4 items-center">
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="mt-1 flex h-7 items-center">
              <Skeleton className="h-5 w-10" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
