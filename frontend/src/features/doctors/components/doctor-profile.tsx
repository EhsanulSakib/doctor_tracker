"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { AwardIcon, CalendarIcon, ClockIcon, IdCardIcon, MailIcon, MapPinIcon, PencilIcon, PhoneIcon, StethoscopeIcon, TrashIcon, WalletIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { useNow } from "@/hooks/use-now";
import { DOCTOR_STATUS_LABELS, DOCTOR_STATUS_TONES, WEEKDAY_LABELS, WEEKDAYS } from "@/lib/constants";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { availabilityOf, formatHours, weekdayOfIso } from "../availability";
import type { Doctor } from "../types";
import { DeleteDoctorDialog } from "./delete-doctor-dialog";
import { DoctorFormDialog } from "./doctor-form-dialog";

const DOT: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-ink-subtle",
  accent: "bg-accent",
};

const TONE_TEXT: Record<string, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-ink-muted",
  accent: "text-accent-fg",
};

/** Chamber days as "Sat · Mon · Wed", today's day highlighted. */
function ChamberDays({ doctor }: { doctor: Doctor }) {
  const todayKey = weekdayOfIso(doctor.today.date);
  const days = WEEKDAYS.filter((d) => doctor.chamberDays.includes(d));
  if (!days.length) return <Missing />;
  return (
    <span className="flex flex-wrap gap-x-1.5">
      {days.map((day, i) => (
        <span key={day} className="flex items-center gap-1.5">
          {i > 0 && (
            <span aria-hidden className="text-line-strong">
              ·
            </span>
          )}
          <span className={cn(day === todayKey && "font-semibold text-accent-fg")} data-tooltip={day === todayKey ? "Today" : undefined}>
            {WEEKDAY_LABELS[day].short}
          </span>
        </span>
      ))}
    </span>
  );
}

const Missing = () => <span className="font-normal text-ink-subtle">Not set</span>;

/**
 * The doctor at a glance, above the tabs: photo with a live status dot, name, specialty and hospital,
 * today's availability, and the facts people look up most (contact, chamber, fee). Edit / Delete.
 */
export function DoctorHeader({ doctor, hospitals }: { doctor: Doctor; hospitals: string[] }) {
  const router = useRouter();
  const now = useNow("minute");
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const today = availabilityOf(doctor, now);
  const hours = formatHours(doctor.chamberStart, doctor.chamberEnd);
  // The dot on the photo: today's availability for active doctors, otherwise the status itself.
  const status =
    doctor.status === "active"
      ? { tone: today.tone, label: today.detail ? `${today.label} · ${today.detail}` : today.label, live: today.live, text: today.label }
      : { tone: DOCTOR_STATUS_TONES[doctor.status], label: DOCTOR_STATUS_LABELS[doctor.status], live: false, text: DOCTOR_STATUS_LABELS[doctor.status] };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="relative shrink-0">
            <Avatar name={doctor.name} src={doctor.photoUrl} size={72} className="ring-4 ring-accent-soft" />
            <Tooltip content={status.label} side="right" className="absolute right-0.5 bottom-0.5">
              <span tabIndex={0} role="img" aria-label={`Status: ${status.label}`} className="relative flex size-4 rounded-full focus-ring">
                {status.live && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-70", DOT[status.tone])} />}
                <span className={cn("relative size-4 rounded-full ring-[3px] ring-surface", DOT[status.tone])} />
              </span>
            </Tooltip>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl leading-7 font-semibold tracking-tight text-ink">{doctor.name}</h1>
            <p className="mt-0.5 truncate text-sm text-ink-muted">
              <span className="font-medium text-accent-fg">{doctor.specialization}</span>
              <span aria-hidden className="mx-1.5 text-line-strong">
                ·
              </span>
              {doctor.hospital}
            </p>
            <p className="mt-1 text-ui">
              <span className={cn("font-semibold", TONE_TEXT[status.tone])}>{status.text}</span>
              {doctor.qualifications && <span className="text-ink-muted"> · {doctor.qualifications}</span>}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 lg:self-start">
          <Button size="sm" variant="secondary" icon={<PencilIcon />} onClick={() => setDialog("edit")}>
            Edit
          </Button>
          <Button size="sm" variant="secondary" icon={<TrashIcon />} onClick={() => setDialog("delete")} className="text-danger hover:text-danger">
            Delete
          </Button>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-3 border-t border-line bg-paper/40 px-4 py-3.5 text-ui sm:grid-cols-2 sm:px-5 xl:grid-cols-4">
        <Fact icon={<PhoneIcon size={15} />} label="Phone" copy={doctor.phone}>
          <a href={`tel:${doctor.phone.replace(/[^\d+]/g, "")}`} className="rounded-sm tabular-nums hover:text-accent-fg focus-ring">
            {doctor.phone}
          </a>
        </Fact>
        <Fact icon={<MailIcon size={15} />} label="Email" copy={doctor.email}>
          <a href={`mailto:${doctor.email}`} className="block truncate rounded-sm hover:text-accent-fg focus-ring">
            {doctor.email}
          </a>
        </Fact>
        <Fact icon={<CalendarIcon size={15} />} label={hours ? `Chamber · ${hours}` : "Chamber"}>
          <ChamberDays doctor={doctor} />
        </Fact>
        <Fact icon={<WalletIcon size={15} />} label="Consultation fee">
          {doctor.consultationFee !== null ? `৳${formatNumber(doctor.consultationFee)}` : <Missing />}
        </Fact>
      </dl>

      <DoctorFormDialog open={dialog === "edit"} onClose={() => setDialog(null)} doctor={doctor} hospitals={hospitals} />
      <DeleteDoctorDialog open={dialog === "delete"} onClose={() => setDialog(null)} doctor={doctor} onDeleted={() => router.replace("/doctors")} />
    </Card>
  );
}

/** The Details tab: degrees, professional facts, chamber, and the bio. */
export function DoctorDetails({ doctor }: { doctor: Doctor }) {
  const hours = formatHours(doctor.chamberStart, doctor.chamberEnd);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card className="p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
          <AwardIcon size={17} className="text-accent-fg" />
          Degrees
        </h2>
        {doctor.degrees.length ? (
          <ol className="mt-3 divide-y divide-line">
            {doctor.degrees.map((degree) => (
              <li key={`${degree.title}-${degree.year}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{degree.title}</p>
                  <p className="truncate text-ui text-ink-muted" data-tooltip={degree.institute}>
                    {degree.institute}
                  </p>
                </div>
                <span className="text-ui font-medium text-ink tabular-nums">{degree.year}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-ui text-ink-subtle">{doctor.qualifications ?? "Not set"}</p>
        )}
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink">
          <StethoscopeIcon size={17} className="text-accent-fg" />
          Practice
        </h2>
        <dl className="mt-4 grid gap-x-6 gap-y-4 text-ui sm:grid-cols-2">
          <Fact icon={<IdCardIcon size={15} />} label="BMDC registration">
            {doctor.registrationNo ?? <Missing />}
          </Fact>
          <Fact icon={<AwardIcon size={15} />} label="Experience">
            {doctor.yearsOfExperience} {doctor.yearsOfExperience === 1 ? "year" : "years"}
          </Fact>
          <Fact icon={<CalendarIcon size={15} />} label="Joined">
            {formatDate(doctor.joinedAt)}
          </Fact>
          <Fact icon={<StethoscopeIcon size={15} />} label="Hospital">
            {doctor.hospital}
          </Fact>
          <Fact icon={<CalendarIcon size={15} />} label="Chamber days">
            <ChamberDays doctor={doctor} />
          </Fact>
          <Fact icon={<ClockIcon size={15} />} label="Chamber hours">
            {hours ?? <Missing />}
          </Fact>
          <Fact icon={<MapPinIcon size={15} />} label="Chamber room">
            {doctor.chamberRoom ?? <Missing />}
          </Fact>
          <Fact icon={<WalletIcon size={15} />} label="Consultation fee">
            {doctor.consultationFee !== null ? `৳${formatNumber(doctor.consultationFee)}` : <Missing />}
          </Fact>
        </dl>
        {doctor.bio && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-caption text-ink-muted">About</p>
            <p className="mt-1 text-sm leading-6 text-ink">{doctor.bio}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function Fact({ icon, label, copy, children }: { icon: ReactNode; label: string; copy?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span aria-hidden className="mt-0.5 text-ink-subtle">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="truncate text-caption text-ink-muted">{label}</dt>
        <dd className="mt-0.5 flex min-w-0 items-center gap-1 font-medium text-ink">
          <span className="min-w-0 truncate">{children}</span>
          {copy && <CopyButton value={copy} label={`Copy ${label.toLowerCase()}`} className="-my-1.5" />}
        </dd>
      </div>
    </div>
  );
}

/** The header card's shape while the profile loads. */
export function DoctorHeaderSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <Skeleton className="size-18 shrink-0 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="mt-2 h-3.5 w-72 max-w-full" />
          <Skeleton className="mt-2 h-3 w-40" />
        </div>
        <div className="hidden gap-2 sm:flex">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="grid gap-4 border-t border-line px-4 py-3.5 sm:grid-cols-2 sm:px-5 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}>
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-2 h-3.5 w-36" />
          </div>
        ))}
      </div>
    </Card>
  );
}
