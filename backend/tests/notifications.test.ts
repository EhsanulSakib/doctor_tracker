import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { NotificationModel } from '../src/modules/notifications/notification.model.js';
import { doctorPayload, insertPatients, loginAsAdmin, patientPayload } from './helpers.js';

const app = createApp();
let cookie: string;

const UNKNOWN_ID = '64b7f0000000000000000000';

const api = {
  list: (query = '') => request(app).get(`/api/notifications${query}`).set('Cookie', cookie),
  markRead: (id: string) => request(app).patch(`/api/notifications/${id}/read`).set('Cookie', cookie),
  markAllRead: () => request(app).post('/api/notifications/read-all').set('Cookie', cookie),
  createDoctor: (body: object) => request(app).post('/api/doctors').set('Cookie', cookie).send(body),
  updateDoctor: (id: string, body: object) => request(app).patch(`/api/doctors/${id}`).set('Cookie', cookie).send(body),
  deleteDoctor: (id: string) => request(app).delete(`/api/doctors/${id}`).set('Cookie', cookie),
  createPatient: (body: object) => request(app).post('/api/patients').set('Cookie', cookie).send(body),
  createForDoctor: (doctorId: string, body: object) =>
    request(app).post(`/api/doctors/${doctorId}/patients`).set('Cookie', cookie).send(body),
  updatePatient: (id: string, body: object) => request(app).patch(`/api/patients/${id}`).set('Cookie', cookie).send(body),
  deletePatient: (id: string) => request(app).delete(`/api/patients/${id}`).set('Cookie', cookie),
};

type Row = { id: string; type: string; title: string; message: string; subject: { kind: string; id: string; name: string }; read: boolean; createdAt: string };

async function createDoctor(overrides: Record<string, unknown> = {}) {
  const res = await api.createDoctor(doctorPayload(overrides));
  expect(res.status).toBe(201);
  return res.body.data as { id: string; name: string };
}

async function createPatient(doctorId: string, overrides: Record<string, unknown> = {}) {
  const res = await api.createPatient(patientPayload({ doctorId, ...overrides }));
  expect(res.status).toBe(201);
  return res.body.data as { id: string; name: string };
}

/** Inserts notifications directly, oldest first, one minute apart. */
async function insertNotifications(count: number, { read = 0 } = {}) {
  const base = Date.now() - count * 60_000;
  await NotificationModel.insertMany(
    Array.from({ length: count }, (_, i) => ({
      type: 'doctor_added',
      title: `Notification ${i + 1}`,
      message: 'Cardiology · Dhanmondi Lakeview Hospital',
      subject: { kind: 'doctor', id: UNKNOWN_ID, name: 'Dr. Test' },
      readAt: i < read ? new Date() : null,
      createdAt: new Date(base + i * 60_000),
    })),
  );
}

const latest = async () => (await api.list()).body.data as Row[];

beforeEach(async () => {
  cookie = await loginAsAdmin(app);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auth on notification routes', () => {
  it('rejects requests without a session', async () => {
    expect((await request(app).get('/api/notifications')).status).toBe(401);
    expect((await request(app).post('/api/notifications/read-all')).status).toBe(401);
    expect((await request(app).patch(`/api/notifications/${UNKNOWN_ID}/read`)).status).toBe(401);
  });
});

describe('GET /api/notifications', () => {
  it('returns the newest first with the unread count of the whole inbox', async () => {
    await insertNotifications(25, { read: 5 });

    const res = await api.list();
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ unreadCount: 20 });
    expect(res.body.data).toHaveLength(20); // default limit
    expect(res.body.data[0].title).toBe('Notification 25');
    expect(res.body.data.at(-1).title).toBe('Notification 6');
    expect(res.body.data[0]).toEqual({
      id: expect.any(String),
      type: 'doctor_added',
      title: 'Notification 25',
      message: 'Cardiology · Dhanmondi Lakeview Hospital',
      subject: { kind: 'doctor', id: UNKNOWN_ID, name: 'Dr. Test' },
      read: false,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  it('honours limit and validates it', async () => {
    await insertNotifications(8);
    expect((await api.list('?limit=3')).body.data).toHaveLength(3);
    expect((await api.list('?limit=50')).body.data).toHaveLength(8);

    for (const limit of ['0', '51', 'abc', '2.5']) {
      const res = await api.list(`?limit=${limit}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('answers with an empty inbox', async () => {
    const res = await api.list();
    expect(res.body).toEqual({ data: [], meta: { unreadCount: 0 } });
  });
});

describe('marking as read', () => {
  it('marks one notification and keeps the first read time on repeat', async () => {
    await insertNotifications(3);
    const [first] = await latest();

    const res = await api.markRead(first!.id);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: first!.id, read: true });
    const { readAt } = (await NotificationModel.findById(first!.id).lean())!;

    const again = await api.markRead(first!.id);
    expect(again.status).toBe(200);
    expect(again.body.data.read).toBe(true);
    expect((await NotificationModel.findById(first!.id).lean())!.readAt).toEqual(readAt);
    expect((await api.list()).body.meta.unreadCount).toBe(2);
  });

  it('answers 404 for an unknown id and 400 for an invalid one', async () => {
    const missing = await api.markRead(UNKNOWN_ID);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    expect((await api.markRead('not-an-id')).status).toBe(400);
  });

  it('marks everything unread as read and reports how many changed', async () => {
    await insertNotifications(6, { read: 2 });

    const res = await api.markAllRead();
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ updated: 4 });
    expect((await api.list()).body.meta.unreadCount).toBe(0);
    expect((await api.markAllRead()).body.data).toEqual({ updated: 0 });
  });
});

describe('notifications from doctor and patient events', () => {
  it('records a new doctor', async () => {
    const doctor = await createDoctor({ name: 'Dr. Nusrat Jahan', specialization: 'Cardiology', hospital: 'Gulshan Crescent Medical Centre' });

    expect(await latest()).toMatchObject([
      {
        type: 'doctor_added',
        title: 'New doctor: Dr. Nusrat Jahan',
        message: 'Cardiology · Gulshan Crescent Medical Centre',
        subject: { kind: 'doctor', id: doctor.id, name: 'Dr. Nusrat Jahan' },
        read: false,
      },
    ]);
  });

  it('adds the "Dr." title only when the stored name lacks it', async () => {
    await createDoctor({ name: 'Farhana Akter' });
    expect((await latest())[0]!.title).toBe('New doctor: Dr. Farhana Akter');
  });

  it('records a doctor going on leave or inactive, with the patients still under care', async () => {
    const doctor = await createDoctor({ name: 'Dr. Arif Hossain' });
    await insertPatients(doctor.id, 3);
    const recovered = await createPatient(doctor.id, { status: 'recovered' });
    expect(recovered.id).toBeTruthy();

    await api.updateDoctor(doctor.id, { status: 'on_leave' });
    expect((await latest())[0]).toMatchObject({
      type: 'doctor_unavailable',
      title: 'Dr. Arif Hossain is on leave',
      message: '3 patients still assigned',
      subject: { kind: 'doctor', id: doctor.id },
    });

    // on_leave → inactive is not a new "became unavailable" event; active → inactive is.
    await api.updateDoctor(doctor.id, { status: 'inactive' });
    expect((await latest()).filter((n) => n.type === 'doctor_unavailable')).toHaveLength(1);

    const solo = await createDoctor({ name: 'Dr. Sadia Islam' });
    await insertPatients(solo.id, 1);
    await api.updateDoctor(solo.id, { status: 'inactive' });
    expect((await latest())[0]).toMatchObject({ title: 'Dr. Sadia Islam is inactive', message: '1 patient still assigned' });

    const empty = await createDoctor({ name: 'Dr. Kamrul Islam' });
    await api.updateDoctor(empty.id, { status: 'on_leave' });
    expect((await latest())[0]).toMatchObject({ title: 'Dr. Kamrul Islam is on leave', message: 'No patients assigned' });
  });

  it('ignores doctor edits that are not a move away from active', async () => {
    const doctor = await createDoctor();
    await api.updateDoctor(doctor.id, { hospital: 'Mirpur Shapla Clinic' });
    await api.updateDoctor(doctor.id, { status: 'active' });
    expect((await latest()).map((n) => n.type)).toEqual(['doctor_added']);
  });

  it('records new patients from both create endpoints', async () => {
    const doctor = await createDoctor({ name: 'Dr. Tahmina Rahman', specialization: 'Pediatrics' });
    const viaPatients = await createPatient(doctor.id, { name: 'Rafiqul Islam' });
    const viaDoctor = await api.createForDoctor(doctor.id, patientPayload({ name: 'Ayesha Siddique' }));
    expect(viaDoctor.status).toBe(201);

    const [second, first] = await latest();
    expect(first).toMatchObject({
      type: 'patient_admitted',
      title: 'New patient: Rafiqul Islam',
      message: 'Assigned to Dr. Tahmina Rahman (Pediatrics)',
      subject: { kind: 'patient', id: viaPatients.id, name: 'Rafiqul Islam' },
    });
    expect(second).toMatchObject({ title: 'New patient: Ayesha Siddique', subject: { id: viaDoctor.body.data.id } });
  });

  it('records a recovery and a reassignment, both when they happen in one edit', async () => {
    const first = await createDoctor({ name: 'Dr. Imran Kabir' });
    const second = await createDoctor({ name: 'Dr. Shirin Sultana' });
    const patient = await createPatient(first.id, { name: 'Mahmudul Hasan' });

    await api.updatePatient(patient.id, { status: 'recovered' });
    expect((await latest())[0]).toMatchObject({
      type: 'patient_recovered',
      title: 'Mahmudul Hasan has recovered',
      message: 'Patient of Dr. Imran Kabir',
      subject: { kind: 'patient', id: patient.id },
    });

    // Already recovered: saving it again is not a new event.
    await api.updatePatient(patient.id, { status: 'recovered', notes: 'Discharged' });
    expect((await latest()).filter((n) => n.type === 'patient_recovered')).toHaveLength(1);

    await api.updatePatient(patient.id, { doctorId: second.id });
    expect((await latest())[0]).toMatchObject({
      type: 'patient_reassigned',
      title: 'Mahmudul Hasan moved to Dr. Shirin Sultana',
      message: 'Previously with Dr. Imran Kabir',
    });

    const other = await createPatient(first.id, { name: 'Lamia Chowdhury' });
    await api.updatePatient(other.id, { status: 'recovered', doctorId: second.id });
    const types = (await latest()).filter((n) => n.subject.id === other.id).map((n) => n.type);
    expect(types.sort()).toEqual(['patient_admitted', 'patient_reassigned', 'patient_recovered']);
    const recovery = (await latest()).find((n) => n.subject.id === other.id && n.type === 'patient_recovered');
    expect(recovery!.message).toBe('Patient of Dr. Shirin Sultana');
  });

  it('ignores a "reassignment" to the same doctor', async () => {
    const doctor = await createDoctor();
    const patient = await createPatient(doctor.id);
    await api.updatePatient(patient.id, { doctorId: doctor.id });
    expect((await latest()).map((n) => n.type)).toEqual(['patient_admitted', 'doctor_added']);
  });
});

describe('cleanup and failure isolation', () => {
  it('removes notifications about a deleted patient or doctor', async () => {
    const doctor = await createDoctor();
    const patient = await createPatient(doctor.id);
    await api.updatePatient(patient.id, { status: 'recovered' });
    expect(await NotificationModel.countDocuments({ 'subject.id': patient.id })).toBe(2);

    expect((await api.deletePatient(patient.id)).status).toBe(204);
    expect(await NotificationModel.countDocuments({ 'subject.id': patient.id })).toBe(0);

    expect((await api.deleteDoctor(doctor.id)).status).toBe(200);
    expect(await NotificationModel.countDocuments()).toBe(0);
  });

  it('keeps the main request working when a notification cannot be written', async () => {
    vi.spyOn(NotificationModel, 'insertMany').mockRejectedValue(new Error('disk full'));
    vi.spyOn(NotificationModel, 'deleteMany').mockRejectedValue(new Error('disk full'));

    const created = await api.createDoctor(doctorPayload({ name: 'Dr. Zahid Alam' }));
    expect(created.status).toBe(201);
    const patient = await api.createPatient(patientPayload({ doctorId: created.body.data.id }));
    expect(patient.status).toBe(201);
    expect((await api.updatePatient(patient.body.data.id, { status: 'recovered' })).status).toBe(200);
    expect((await api.updateDoctor(created.body.data.id, { status: 'on_leave' })).status).toBe(200);
    expect((await api.deletePatient(patient.body.data.id)).status).toBe(204);

    vi.restoreAllMocks();
    expect((await api.list()).body.data).toEqual([]);
  });
});
