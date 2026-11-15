import type { Model, PipelineStage, Types } from 'mongoose';
import {
  CONDITIONS,
  PATIENT_STATUSES,
  SPECIALIZATIONS,
  type Condition,
  type PatientStatus,
  type Specialization,
} from '../../constants/enums.js';
import { TtlCache } from '../../lib/ttl-cache.js';
import { DoctorModel } from '../doctors/doctor.model.js';
import { PatientModel } from '../patients/patient.model.js';
import type { DashboardRange } from './dashboard.schema.js';

type Unit = 'day' | 'week' | 'month';

/**
 * Each range is a whole number of chart buckets ending with the current (partial) one, so the
 * chart's total always equals `newPatients.current`, and the previous period has the same length.
 * 90d = the last 13 weeks (Monday-based, about 90 days).
 */
const RANGES: Record<DashboardRange, { unit: Unit; buckets: number }> = {
  '30d': { unit: 'day', buckets: 30 },
  '90d': { unit: 'week', buckets: 13 },
  '12m': { unit: 'month', buckets: 12 },
};

const TOP_DOCTORS_LIMIT = 10;
const CACHE_TTL_MS = 60_000;

type Breakdown<K extends string> = Array<{ key: K; count: number }>;

export type DashboardStats = {
  range: DashboardRange;
  generatedAt: Date;
  period: { unit: Unit; from: Date; to: Date; previousFrom: Date };
  kpis: {
    totalDoctors: number;
    activeDoctors: number;
    totalPatients: number;
    /** Admissions in this period vs the previous one. `deltaPct` is null when the previous period had none. */
    newPatients: { current: number; previous: number; deltaPct: number | null };
    avgPatientsPerDoctor: number;
  };
  /** One entry per bucket (UTC start date, YYYY-MM-DD), including empty ones. */
  patientsOverTime: Array<{ bucket: string; count: number }>;
  /** Current caseload: doctors with the most assigned patients (all time). */
  topDoctors: Array<{ id: string; name: string; specialization: Specialization; count: number }>;
  byCondition: Breakdown<Condition>;
  byStatus: Breakdown<PatientStatus>;
  doctorsBySpecialization: Breakdown<Specialization>;
};

// ─── Dates (all UTC, like the stored admission dates) ────────────────────────────────────

/** Start of the bucket that contains `date`: midnight, the Monday of its week, or the 1st of its month. */
function truncate(date: Date, unit: Unit): Date {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (unit === 'week') start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (unit === 'month') start.setUTCDate(1);
  return start;
}

function addUnits(date: Date, unit: Unit, amount: number): Date {
  const result = new Date(date);
  if (unit === 'day') result.setUTCDate(result.getUTCDate() + amount);
  if (unit === 'week') result.setUTCDate(result.getUTCDate() + 7 * amount);
  if (unit === 'month') result.setUTCMonth(result.getUTCMonth() + amount); // always called on the 1st, so no overflow
  return result;
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export function periodFor(range: DashboardRange, now = new Date()) {
  const { unit, buckets } = RANGES[range];
  const from = addUnits(truncate(now, unit), unit, -(buckets - 1));
  return { unit, buckets, from, to: now, previousFrom: addUnits(from, unit, -buckets) };
}

// ─── Queries ─────────────────────────────────────────────────────────────────────────────

/** Admissions per bucket. MongoDB groups by bucket start; empty buckets are filled in here so the chart has no gaps. */
async function patientsOverTime({ unit, buckets, from, to }: ReturnType<typeof periodFor>) {
  const rows = await PatientModel.aggregate<{ _id: Date; count: number }>([
    { $match: { admissionDate: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: { $dateTrunc: { date: '$admissionDate', unit, timezone: 'UTC', ...(unit === 'week' && { startOfWeek: 'monday' }) } },
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = new Map(rows.map((row) => [isoDay(row._id), row.count]));
  return Array.from({ length: buckets }, (_, i) => {
    const bucket = isoDay(addUnits(from, unit, i));
    return { bucket, count: counts.get(bucket) ?? 0 };
  });
}

/**
 * A `$sort` on the grouped field lets MongoDB read it straight from the index that starts with it
 * (a covered index scan: no documents loaded) instead of scanning the whole collection.
 */
const indexOrderedGroup = (field: string): PipelineStage[] => [
  { $sort: { [field]: 1 } },
  { $group: { _id: `$${field}`, count: { $sum: 1 } } },
];

/** Group → sort → limit first, so the doctor lookup runs for 10 rows, not for every patient. */
async function topDoctors(): Promise<DashboardStats['topDoctors']> {
  const rows = await PatientModel.aggregate<{
    _id: Types.ObjectId;
    count: number;
    doctor: { name: string; specialization: Specialization };
  }>([
    ...indexOrderedGroup('doctorId'),
    { $sort: { count: -1, _id: 1 } },
    { $limit: TOP_DOCTORS_LIMIT },
    {
      $lookup: {
        from: DoctorModel.collection.collectionName,
        localField: '_id',
        foreignField: '_id',
        as: 'doctor',
        pipeline: [{ $project: { _id: 0, name: 1, specialization: 1 } }],
      },
    },
    { $unwind: '$doctor' }, // drops a group whose doctor no longer exists
  ]);

  return rows.map((row) => ({ id: row._id.toString(), ...row.doctor, count: row.count }));
}

/** `{ value: count }` for one field across the whole collection. */
async function countBy(model: Model<any>, field: string): Promise<Map<string, number>> {
  const rows = await model.aggregate<{ _id: string; count: number }>(indexOrderedGroup(field));
  return new Map(rows.map((row) => [row._id, row.count]));
}

/** Every allowed value, zeros included, so chart categories (and colors) stay stable. */
function toBreakdown<K extends string>(keys: readonly K[], counts: Map<string, number>, sortByCount: boolean): Breakdown<K> {
  const rows = keys.map((key) => ({ key, count: counts.get(key) ?? 0 }));
  // Array.prototype.sort is stable, so ties keep the enum order.
  return sortByCount ? rows.sort((a, b) => b.count - a.count) : rows;
}

const deltaPct = (current: number, previous: number) =>
  previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10;

async function computeStats(range: DashboardRange): Promise<DashboardStats> {
  const period = periodFor(range);
  const inPeriod = { $gte: period.from, $lte: period.to };

  // Independent queries, all in flight at once.
  const [
    totalDoctors,
    activeDoctors,
    totalPatients,
    newCurrent,
    newPrevious,
    series,
    top,
    conditionCounts,
    statusCounts,
    specializationCounts,
  ] = await Promise.all([
    DoctorModel.estimatedDocumentCount(), // collection metadata: no scan
    DoctorModel.countDocuments({ status: 'active' }),
    PatientModel.estimatedDocumentCount(),
    PatientModel.countDocuments({ admissionDate: inPeriod }),
    PatientModel.countDocuments({ admissionDate: { $gte: period.previousFrom, $lt: period.from } }),
    patientsOverTime(period),
    topDoctors(),
    countBy(PatientModel, 'condition'),
    countBy(PatientModel, 'status'),
    countBy(DoctorModel, 'specialization'),
  ]);

  return {
    range,
    generatedAt: new Date(),
    period: { unit: period.unit, from: period.from, to: period.to, previousFrom: period.previousFrom },
    kpis: {
      totalDoctors,
      activeDoctors,
      totalPatients,
      newPatients: { current: newCurrent, previous: newPrevious, deltaPct: deltaPct(newCurrent, newPrevious) },
      avgPatientsPerDoctor: totalDoctors === 0 ? 0 : Math.round((totalPatients / totalDoctors) * 10) / 10,
    },
    patientsOverTime: series,
    topDoctors: top,
    byCondition: toBreakdown(CONDITIONS, conditionCounts, true),
    byStatus: toBreakdown(PATIENT_STATUSES, statusCounts, false),
    doctorsBySpecialization: toBreakdown(SPECIALIZATIONS, specializationCounts, true),
  };
}

// ─── Cache ───────────────────────────────────────────────────────────────────────────────

// Caches the promise, not the value, so concurrent requests on a cold cache share one computation.
const cache = new TtlCache<Promise<DashboardStats>>(CACHE_TTL_MS);

export function getDashboardStats(range: DashboardRange): Promise<DashboardStats> {
  const cached = cache.get(range);
  if (cached) return cached;

  const pending = computeStats(range);
  cache.set(range, pending);
  pending.catch(() => cache.delete(range)); // never keep a failure
  return pending;
}

/** Called after every doctor / patient write so the dashboard never shows stale numbers. */
export function clearDashboardCache(): void {
  cache.clear();
}
