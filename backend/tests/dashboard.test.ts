import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { CONDITIONS, SPECIALIZATIONS } from '../src/constants/enums.js';
import { todayAsDateOnly } from '../src/lib/dates.js';
import { clearDashboardCache, periodFor } from '../src/modules/dashboard/dashboard.service.js';
import { DoctorModel } from '../src/modules/doctors/doctor.model.js';
import { doctorPayload, insertPatients, loginAsAdmin, patientPayload } from './helpers.js';

const app = createApp();
let cookie: string;

const stats = (range?: string) =>
  request(app)
    .get(`/api/dashboard/stats${range === undefined ? '' : `?range=${range}`}`)
    .set('Cookie', cookie);

/** The calendar date `days` before today in APP_TIMEZONE (Asia/Dhaka), as YYYY-MM-DD. */
function daysAgo(days: number): string {
  const today = todayAsDateOnly();
  return new Date(today.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

async function createDoctor(overrides: Record<string, unknown> = {}) {
  const res = await request(app).post('/api/doctors').set('Cookie', cookie).send(doctorPayload(overrides));
  expect(res.status).toBe(201);
  return res.body.data as { id: string; name: string };
}

async function createPatient(doctorId: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app).post('/api/patients').set('Cookie', cookie).send(patientPayload({ doctorId, ...overrides }));
  expect(res.status).toBe(201);
  return res.body.data as { id: string };
}

type Bucket = { bucket: string; count: number };
const sum = (series: Bucket[]) => series.reduce((total, b) => total + b.count, 0);

beforeEach(async () => {
  clearDashboardCache(); // the cache is module state; the DB is wiped after each test
  cookie = await loginAsAdmin(app);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/dashboard/stats: access and validation', () => {
  it('rejects requests without a session', async () => {
    expect((await request(app).get('/api/dashboard/stats')).status).toBe(401);
  });

  it('rejects an unknown range and defaults to 30d', async () => {
    const bad = await stats('7d');
    expect(bad.status).toBe(400);
    expect(bad.body.error.details).toEqual([{ path: 'range', message: 'Use 30d, 90d or 12m' }]);

    expect((await stats()).body.data.range).toBe('30d');
    expect((await stats('')).body.data.range).toBe('30d');
  });
});

describe('GET /api/dashboard/stats: empty database', () => {
  it('returns zeros, every bucket and every category', async () => {
    for (const [range, buckets] of [['30d', 30], ['90d', 13], ['12m', 12]] as const) {
      const { data } = (await stats(range)).body;

      expect(data.kpis).toEqual({
        totalDoctors: 0,
        activeDoctors: 0,
        totalPatients: 0,
        newPatients: { current: 0, previous: 0, deltaPct: null },
        avgPatientsPerDoctor: 0,
      });
      expect(data.patientsOverTime).toHaveLength(buckets);
      expect(sum(data.patientsOverTime)).toBe(0);
      expect(data.topDoctors).toEqual([]);
      expect(data.byCondition.map((r: { key: string }) => r.key)).toEqual([...CONDITIONS]);
      expect(data.byStatus).toEqual([
        { key: 'active', count: 0 },
        { key: 'under_treatment', count: 0 },
        { key: 'recovered', count: 0 },
      ]);
      expect(data.doctorsBySpecialization.map((r: { key: string }) => r.key)).toEqual([...SPECIALIZATIONS]);
    }
  });
});

describe('GET /api/dashboard/stats: numbers', () => {
  it('computes KPIs, the time series, top doctors and breakdowns', async () => {
    const busy = await createDoctor({ name: 'Dr. Busy', specialization: 'Cardiology' });
    const away = await createDoctor({ name: 'Dr. Away', specialization: 'Neurology', status: 'on_leave' });
    await createDoctor({ name: 'Dr. Idle', specialization: 'Cardiology' });

    await createPatient(busy.id, { admissionDate: daysAgo(0), condition: 'Asthma', status: 'active' });
    await createPatient(busy.id, { admissionDate: daysAgo(3), condition: 'Asthma', status: 'recovered' });
    await createPatient(away.id, { admissionDate: daysAgo(40), condition: 'Diabetes', status: 'active' }); // previous 30 days
    await createPatient(busy.id, { admissionDate: daysAgo(200), condition: 'Migraine', status: 'under_treatment' });

    const { data } = (await stats('30d')).body;

    expect(data.kpis).toEqual({
      totalDoctors: 3,
      activeDoctors: 2,
      totalPatients: 4,
      newPatients: { current: 2, previous: 1, deltaPct: 100 },
      avgPatientsPerDoctor: 1.3,
    });

    // 30 daily buckets ending today; empty days are present with 0.
    const series: Bucket[] = data.patientsOverTime;
    expect(series).toHaveLength(30);
    expect(series.at(-1)).toEqual({ bucket: daysAgo(0), count: 1 });
    expect(series.find((b) => b.bucket === daysAgo(3))?.count).toBe(1);
    expect(series[0]?.bucket).toBe(daysAgo(29));
    expect(sum(series)).toBe(data.kpis.newPatients.current);

    expect(data.topDoctors).toEqual([
      { id: busy.id, name: 'Dr. Busy', specialization: 'Cardiology', count: 3 },
      { id: away.id, name: 'Dr. Away', specialization: 'Neurology', count: 1 },
    ]);

    expect(data.byCondition.slice(0, 3)).toEqual([
      { key: 'Asthma', count: 2 },
      { key: 'Diabetes', count: 1 },
      { key: 'Migraine', count: 1 },
    ]);
    expect(data.byCondition).toHaveLength(CONDITIONS.length);
    expect(data.byStatus).toEqual([
      { key: 'active', count: 2 },
      { key: 'under_treatment', count: 1 },
      { key: 'recovered', count: 1 },
    ]);
    expect(data.doctorsBySpecialization.slice(0, 2)).toEqual([
      { key: 'Cardiology', count: 2 },
      { key: 'Neurology', count: 1 },
    ]);
  });

  it('uses weekly buckets for 90d and monthly buckets for 12m, matching the KPI', async () => {
    const doctor = await createDoctor();
    for (const days of [0, 3, 40, 200]) await createPatient(doctor.id, { admissionDate: daysAgo(days) });

    const quarter = (await stats('90d')).body.data;
    expect(quarter.patientsOverTime).toHaveLength(13);
    expect(quarter.kpis.newPatients).toEqual({ current: 3, previous: 0, deltaPct: null });
    expect(sum(quarter.patientsOverTime)).toBe(3);
    for (const { bucket } of quarter.patientsOverTime) expect(new Date(bucket).getUTCDay()).toBe(1); // Mondays

    const year = (await stats('12m')).body.data;
    expect(year.patientsOverTime).toHaveLength(12);
    expect(year.kpis.newPatients).toEqual({ current: 4, previous: 0, deltaPct: null });
    expect(sum(year.patientsOverTime)).toBe(4);
    for (const { bucket } of year.patientsOverTime) expect(bucket.endsWith('-01')).toBe(true);
  });
});

describe('periodFor', () => {
  it('aligns each range to whole buckets ending with the current one', () => {
    const sunday = new Date('2026-11-15T10:00:00.000Z');
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    const days = periodFor('30d', sunday);
    expect([iso(days.from), iso(days.previousFrom)]).toEqual(['2026-10-17', '2026-09-17']);

    const weeks = periodFor('90d', sunday);
    expect([iso(weeks.from), iso(weeks.previousFrom)]).toEqual(['2026-08-17', '2026-05-18']);

    const months = periodFor('12m', sunday);
    expect([iso(months.from), iso(months.previousFrom)]).toEqual(['2025-12-01', '2024-12-01']);
    expect(iso(months.to)).toBe('2026-11-16'); // exclusive: start of tomorrow

    // Month arithmetic from a 31st must not overflow into the next month.
    expect(iso(periodFor('12m', new Date('2026-03-31T10:00:00.000Z')).from)).toBe('2025-04-01');
  });

  it('uses the calendar date in Asia/Dhaka (UTC+6), not the UTC date', () => {
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    // 20:00 UTC on the 15th is 02:00 on the 16th in Dhaka.
    const lateEvening = periodFor('30d', new Date('2026-11-15T20:00:00.000Z'));
    expect([iso(lateEvening.from), iso(lateEvening.to)]).toEqual(['2026-10-18', '2026-11-17']);

    // 19:00 UTC on 30 Nov is already 1 December in Dhaka, so December is the current month.
    expect(iso(periodFor('12m', new Date('2026-11-30T19:00:00.000Z')).from)).toBe('2026-01-01');
  });
});

describe('GET /api/dashboard/stats: cache', () => {
  it('serves cached results until a doctor or patient write clears them', async () => {
    const doctor = await createDoctor();
    const first = (await stats()).body.data;
    expect(first.kpis.totalPatients).toBe(0);

    // A write that bypasses the API doesn't clear the cache, so the cached numbers come back.
    await insertPatients(doctor.id, 2);
    const cached = (await stats()).body.data;
    expect(cached.kpis.totalPatients).toBe(0);
    expect(cached.generatedAt).toBe(first.generatedAt);

    // Patient create, delete and doctor update through the API each clear it.
    const patient = await createPatient(doctor.id);
    expect((await stats()).body.data.kpis.totalPatients).toBe(3);

    await insertPatients(doctor.id, 1);
    await request(app).delete(`/api/patients/${patient.id}`).set('Cookie', cookie).expect(204);
    expect((await stats()).body.data.kpis.totalPatients).toBe(3);

    await insertPatients(doctor.id, 1);
    await request(app).patch(`/api/doctors/${doctor.id}`).set('Cookie', cookie).send({ status: 'inactive' }).expect(200);
    const afterUpdate = (await stats()).body.data.kpis;
    expect(afterUpdate).toMatchObject({ totalPatients: 4, activeDoctors: 0 });
  });

  it('caches each range separately and shares one computation between concurrent requests', async () => {
    const spy = vi.spyOn(DoctorModel, 'estimatedDocumentCount');

    await Promise.all([stats('30d'), stats('30d'), stats('30d')]);
    expect(spy).toHaveBeenCalledTimes(1);

    await stats('12m');
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
