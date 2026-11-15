import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { todayInAppTimezone, weekdayOf } from '../src/lib/dates.js';
import { AttendanceModel } from '../src/modules/attendance/attendance.model.js';
import { cookiesFrom, doctorPayload, loginAsAdmin, patientPayload } from './helpers.js';

const app = createApp();
let cookie: string;

beforeEach(async () => {
  cookie = await loginAsAdmin(app);
});

const daysAgo = (n: number) => new Date(new Date(`${todayInAppTimezone()}T00:00:00Z`).getTime() - n * 86_400_000).toISOString().slice(0, 10);

async function createDoctor(overrides: Record<string, unknown> = {}) {
  const res = await request(app).post('/api/doctors').set('Cookie', cookie).send(doctorPayload(overrides));
  expect(res.status).toBe(201);
  return res.body.data;
}

describe('doctor profile fields', () => {
  it('stores qualifications, fee and chamber hours, in week order', async () => {
    const doctor = await createDoctor({
      qualifications: 'MBBS, FCPS (Medicine)',
      registrationNo: 'A-45210',
      consultationFee: 1000,
      bio: 'Twenty years in internal medicine.',
      chamberRoom: 'Room 304, 3rd floor',
      chamberDays: ['thu', 'sat', 'mon', 'sat'],
      chamberStart: '17:00',
      chamberEnd: '21:00',
    });

    expect(doctor).toMatchObject({
      qualifications: 'MBBS, FCPS (Medicine)',
      registrationNo: 'A-45210',
      consultationFee: 1000,
      chamberRoom: 'Room 304, 3rd floor',
      chamberDays: ['sat', 'mon', 'thu'],
      chamberStart: '17:00',
      chamberEnd: '21:00',
      patientStats: { active: 0, under_treatment: 0, recovered: 0 },
      today: { date: todayInAppTimezone(), attendance: null },
    });
  });

  it('defaults to no chamber days and empty details', async () => {
    const doctor = await createDoctor();
    expect(doctor).toMatchObject({ chamberDays: [], chamberStart: null, consultationFee: null, qualifications: null });
  });

  it('rejects chamber hours that end before they start, also on a partial update', async () => {
    const bad = await request(app).post('/api/doctors').set('Cookie', cookie).send(doctorPayload({ chamberStart: '18:00', chamberEnd: '09:00' }));
    expect(bad.status).toBe(400);

    const doctor = await createDoctor({ chamberStart: '09:00', chamberEnd: '13:00' });
    const partial = await request(app).patch(`/api/doctors/${doctor.id}`).set('Cookie', cookie).send({ chamberEnd: '08:00' });
    expect(partial.status).toBe(400);
    expect(partial.body.error.details).toEqual([{ path: 'chamberEnd', message: 'End time must be after the start time' }]);
  });

  it('reports patients per status and whether today is a chamber day', async () => {
    const today = weekdayOf(todayInAppTimezone());
    const doctor = await createDoctor({ chamberDays: [today] });
    for (const status of ['active', 'active', 'recovered']) {
      await request(app).post(`/api/doctors/${doctor.id}/patients`).set('Cookie', cookie).send(patientPayload({ status }));
    }

    const { body } = await request(app).get(`/api/doctors/${doctor.id}`).set('Cookie', cookie);
    expect(body.data.patientCount).toBe(3);
    expect(body.data.patientStats).toEqual({ active: 2, under_treatment: 0, recovered: 1 });
    expect(body.data.today.scheduled).toBe(true);
  });
});

describe('attendance', () => {
  it('marks today, shows it on the doctor, and can clear it', async () => {
    const doctor = await createDoctor();

    const marked = await request(app).put(`/api/doctors/${doctor.id}/attendance`).set('Cookie', cookie).send({ status: 'present' });
    expect(marked.status).toBe(200);
    expect(marked.body.data).toEqual({ date: todayInAppTimezone(), status: 'present' });

    const list = await request(app).get('/api/doctors').set('Cookie', cookie);
    expect(list.body.data[0].today.attendance).toBe('present');

    await request(app).put(`/api/doctors/${doctor.id}/attendance`).set('Cookie', cookie).send({ status: null });
    const after = await request(app).get(`/api/doctors/${doctor.id}`).set('Cookie', cookie);
    expect(after.body.data.today.attendance).toBeNull();
  });

  it('returns the history window with a summary', async () => {
    const doctor = await createDoctor();
    await request(app).put(`/api/doctors/${doctor.id}/attendance`).set('Cookie', cookie).send({ date: daysAgo(1), status: 'present' });
    await request(app).put(`/api/doctors/${doctor.id}/attendance`).set('Cookie', cookie).send({ date: daysAgo(2), status: 'absent' });
    await request(app).put(`/api/doctors/${doctor.id}/attendance`).set('Cookie', cookie).send({ date: daysAgo(40), status: 'present' });

    const { body } = await request(app).get(`/api/doctors/${doctor.id}/attendance?days=30`).set('Cookie', cookie);
    expect(body.data.from).toBe(daysAgo(29));
    expect(body.data.to).toBe(daysAgo(0));
    expect(body.data.records).toEqual([
      { date: daysAgo(1), status: 'present' },
      { date: daysAgo(2), status: 'absent' },
    ]);
    expect(body.data.summary).toEqual({ present: 1, absent: 1, leave: 0 });
  });

  it('refuses future days and the demo account', async () => {
    const doctor = await createDoctor();
    const future = await request(app).put(`/api/doctors/${doctor.id}/attendance`).set('Cookie', cookie).send({ date: '2999-01-01', status: 'present' });
    expect(future.status).toBe(400);

    const demo = cookiesFrom(await request(app).post('/api/auth/demo'));
    const res = await request(app)
      .put(`/api/doctors/${doctor.id}/attendance`)
      .set('Cookie', `dt_access=${demo.dt_access?.value}`)
      .send({ status: 'present' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('DEMO_READ_ONLY');
  });

  it('is removed with the doctor', async () => {
    const doctor = await createDoctor();
    await request(app).put(`/api/doctors/${doctor.id}/attendance`).set('Cookie', cookie).send({ status: 'present' });
    expect((await request(app).delete(`/api/doctors/${doctor.id}`).set('Cookie', cookie)).status).toBe(200);
    expect((await request(app).get(`/api/doctors/${doctor.id}/attendance`).set('Cookie', cookie)).status).toBe(404);
    expect(await AttendanceModel.countDocuments()).toBe(0);
  });
});
