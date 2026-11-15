"use client";

import { m } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { ChevronRightIcon, EyeIcon, TrashIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { DeletePatientDialog } from "@/features/patients/components/delete-patient-dialog";
import type { Patient } from "@/features/patients/types";
import { clientFetch } from "@/lib/api/client-fetch";
import type { Paginated } from "@/lib/api/types";
import { GENDER_LABELS, PATIENT_STATUS_LABELS, PATIENT_STATUS_TONES, PATIENT_STATUSES } from "@/lib/constants";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { Doctor } from "../types";

const PREVIEW_SIZE = 5;
const STATUS_TEXT = { active: "text-info", under_treatment: "text-warning", recovered: "text-success" } as const;

/**
 * Loaded once per doctor and kept while the page is open: collapsing and expanding the same row again is
 * instant. The key includes the patient count, so adding or removing a patient loads fresh rows.
 */
const cache = new Map<string, Patient[]>();

/** The panel under an expanded doctor row: the newest patients, the status split, and a link to all of them. */
export function DoctorPatientsPreview({ doctor }: { doctor: Doctor }) {
  const key = `${doctor.id}:${doctor.patientCount}`;
  const [loaded, setLoaded] = useState<{ key: string; patients: Patient[] } | { key: string; error: true } | null>(() =>
    cache.has(key) ? { key, patients: cache.get(key)! } : null,
  );

  useEffect(() => {
    if (cache.has(key) || doctor.patientCount === 0) return;
    const controller = new AbortController();
    clientFetch<Paginated<Patient>>(`/doctors/${doctor.id}/patients`, { searchParams: { limit: PREVIEW_SIZE }, signal: controller.signal })
      .then(({ data }) => {
        cache.set(key, data);
        setLoaded({ key, patients: data });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoaded({ key, error: true });
      });
    return () => controller.abort();
  }, [key, doctor.id, doctor.patientCount]);

  const current = loaded?.key === key ? loaded : null;
  const patients = current && "patients" in current ? current.patients : null;
  const router = useRouter();
  // Kept after closing, so the dialog doesn't go blank during its exit animation.
  const [removing, setRemoving] = useState<{ patient: Patient; open: boolean } | null>(null);

  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <p className="text-ui font-semibold text-ink">
          {formatNumber(doctor.patientCount)} {doctor.patientCount === 1 ? "patient" : "patients"}
        </p>
        {PATIENT_STATUSES.map((status) => (
          <span key={status} className="text-caption text-ink-muted">
            {PATIENT_STATUS_LABELS[status]} <span className={cn("font-semibold tabular-nums", STATUS_TEXT[status])}>{doctor.patientStats[status]}</span>
          </span>
        ))}
        {doctor.patientCount > 0 && (
          <Link
            href={`/doctors/${doctor.id}`}
            className="ml-auto inline-flex items-center gap-1 rounded-sm text-ui font-medium text-accent-fg hover:underline focus-ring"
          >
            View all <ChevronRightIcon size={14} />
          </Link>
        )}
      </div>

      {doctor.patientCount === 0 ? (
        <p className="rounded-control border border-dashed border-line px-4 py-5 text-center text-ui text-ink-muted">No patients assigned yet</p>
      ) : current && "error" in current ? (
        <p className="text-ui text-danger">Couldn&apos;t load the patients.</p>
      ) : (
        <div className="overflow-hidden rounded-control border border-line bg-surface">
          <table className="w-full border-collapse text-ui">
            <thead>
              <tr className="bg-paper/70 text-left text-label font-semibold text-ink-subtle uppercase">
                <th scope="col" className="px-3 py-2">Patient</th>
                <th scope="col" className="hidden px-3 py-2 text-right sm:table-cell">Age</th>
                <th scope="col" className="hidden px-3 py-2 sm:table-cell">Gender</th>
                <th scope="col" className="hidden px-3 py-2 md:table-cell">Condition</th>
                <th scope="col" className="px-3 py-2">Status</th>
                <th scope="col" className="hidden px-3 py-2 lg:table-cell">Admitted</th>
                <th scope="col" className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients
                ? patients.map((p, index) => (
                    <m.tr
                      key={p.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.04 }}
                      className="border-t border-line"
                    >
                      <td className="px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Avatar name={p.name} size={28} />
                          <span className="truncate font-medium text-ink">{p.name}</span>
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 text-right text-ink tabular-nums sm:table-cell">{p.age}</td>
                      <td className="hidden px-3 py-2 text-ink-muted sm:table-cell">{GENDER_LABELS[p.gender]}</td>
                      <td className="hidden px-3 py-2 whitespace-nowrap text-ink-muted md:table-cell">{p.condition}</td>
                      <td className="px-3 py-2">
                        <Badge tone={PATIENT_STATUS_TONES[p.status]}>{PATIENT_STATUS_LABELS[p.status]}</Badge>
                      </td>
                      <td className="hidden px-3 py-2 whitespace-nowrap text-ink-muted tabular-nums lg:table-cell">{formatDate(p.admissionDate)}</td>
                      <td className="px-2 py-1 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton size="sm" label={`View ${p.name}`} title="View patient" icon={<EyeIcon />} onClick={() => router.push(`/patients/${p.id}`)} className="hover:bg-accent-soft hover:text-accent-fg" />
                          <IconButton
                            size="sm"
                            label={`Remove ${p.name} from ${doctor.name}`}
                            title="Remove patient"
                            icon={<TrashIcon />}
                            onClick={() => setRemoving({ patient: p, open: true })}
                            className="hover:bg-danger-soft hover:text-danger"
                          />
                        </div>
                      </td>
                    </m.tr>
                  ))
                : Array.from({ length: Math.min(PREVIEW_SIZE, doctor.patientCount) }, (_, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <Skeleton className="size-7 rounded-full" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </td>
                      <td className="hidden px-3 py-2 sm:table-cell">
                        <Skeleton className="ml-auto h-3 w-6" />
                      </td>
                      <td className="hidden px-3 py-2 sm:table-cell">
                        <Skeleton className="h-3 w-12" />
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <Skeleton className="h-3 w-20" />
                      </td>
                      <td className="px-3 py-2">
                        <Skeleton className="h-3 w-16" />
                      </td>
                      <td className="hidden px-3 py-2 lg:table-cell">
                        <Skeleton className="h-3 w-20" />
                      </td>
                      <td className="px-3 py-2">
                        <Skeleton className="ml-auto h-3 w-12" />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
      {patients && doctor.patientCount > patients.length && (
        <p className="mt-2 text-caption text-ink-subtle">
          Newest {patients.length} of {formatNumber(doctor.patientCount)}
        </p>
      )}

      {/* After a removal the list refreshes: the doctor's patient count changes, so this panel loads fresh rows. */}
      <DeletePatientDialog open={!!removing?.open} onClose={() => setRemoving((r) => r && { ...r, open: false })} patient={removing?.patient ?? null} />
    </div>
  );
}
