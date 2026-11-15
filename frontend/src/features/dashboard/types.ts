import type { Condition, PatientStatus, Specialization } from "@/lib/constants";

/** `GET /api/dashboard/stats` (backend module 2.3). */
export const DASHBOARD_RANGES = ["30d", "90d", "12m"] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];
export const DEFAULT_RANGE: DashboardRange = "30d";

export const RANGE_LABELS: Record<DashboardRange, { tab: string; period: string; previous: string }> = {
  "30d": { tab: "30 days", period: "last 30 days", previous: "previous 30 days" },
  "90d": { tab: "90 days", period: "last 13 weeks", previous: "previous 13 weeks" },
  "12m": { tab: "12 months", period: "last 12 months", previous: "previous 12 months" },
};

export type BucketUnit = "day" | "week" | "month";

export type DashboardStats = {
  range: DashboardRange;
  /** ISO timestamp: when the numbers were computed (cached up to 60 s). */
  generatedAt: string;
  period: { unit: BucketUnit; from: string; to: string; previousFrom: string };
  kpis: {
    totalDoctors: number;
    activeDoctors: number;
    totalPatients: number;
    newPatients: { current: number; previous: number; deltaPct: number | null };
    avgPatientsPerDoctor: number;
  };
  /** Zero-filled; `bucket` is a UTC date `YYYY-MM-DD` (a day, the Monday of a week, or the 1st of a month). */
  patientsOverTime: { bucket: string; count: number }[];
  topDoctors: { id: string; name: string; specialization: Specialization; count: number }[];
  byCondition: { key: Condition; count: number }[];
  byStatus: { key: PatientStatus; count: number }[];
  doctorsBySpecialization: { key: Specialization; count: number }[];
};
