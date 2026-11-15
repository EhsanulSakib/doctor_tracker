import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { PatientModel } from '../src/modules/patients/patient.model.js';
import { doctorPayload, loginAsAdmin, patientPayload } from './helpers.js';

const app = createApp();
let cookie: string;

const UNKNOWN_ID = '64b7f0000000000000000000';

const api = {
  list: (query = '') => request(app).get(`/api/patients${query}`).set('Cookie', cookie),
  get: (id: string) => request(app).get(`/api/patients/${id}`).set('Cookie', cookie),
  create: (body: object) => request(app).post('/api/patients').set('Cookie', cookie).send(body),
  update: (id: string, body: object) => request(app).patch(`/api/patients/${id}`).set('Cookie', cookie).send(body),
  remove: (id: string) => request(app).delete(`/api/patients/${id}`).set('Cookie', cookie),
  listForDoctor: (doctorId: string, query = '') =>
    request(app).get(`/api/doctors/${doctorId}/patients${query}`).set('Cookie', cookie),
  createForDoctor: (doctorId: string, body: object) =>
    request(app).post(`/api/doctors/${doctorId}/patients`).set('Cookie', cookie).send(body),
  getDoctor: (id: string) => request(app).get(`/api/doctors/${id}`).set('Cookie', cookie),
};

type DoctorRow = { id: string; name: string; specialization: string };
type PatientRow = { id: string; name: string; doctorId: string; doctor: DoctorRow | null };

async function createDoctor(overrides: Record<string, unknown> = {}) {
  const res = await request(app).post('/api/doctors').set('Cookie', cookie).send(doctorPayload(overrides));
  expect(res.status).toBe(201);
  return res.body.data as DoctorRow;
}

async function createPatient(doctorId: string, overrides: Record<string, unknown> = {}) {
  const res = await api.create(patientPayload({ doctorId, ...overrides }));
  expect(res.status).toBe(201);
  return res.body.data as PatientRow;
}

const names = (res: request.Response) => res.body.data.map((p: { name: string }) => p.name);
const errorPaths = (res: request.Response) => res.body.error.details.map((d: { path: string }) => d.path).sort();

let doctor: DoctorRow;

beforeEach(async () => {
  cookie = await loginAsAdmin(app);
  doctor = await createDoctor({ name: 'Dr. Lena Okafor', specialization: 'Neurology' });
});

describe('auth on patient routes', () => {
  it('rejects requests without a session', async () => {
    expect((await request(app).get('/api/patients')).status).toBe(401);
    expect((await request(app).post('/api/patients').send({})).status).toBe(401);
    expect((await request(app).get(`/api/doctors/${doctor.id}/patients`)).status).toBe(401);
  });
});

describe('POST /api/patients', () => {
  it('creates a patient with its doctor summary and no internal fields', async () => {
    const res = await api.create(patientPayload({ doctorId: doctor.id, name: 'Maya Chen', email: 'Maya.Chen@Mail.com' }));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: expect.any(String),
      name: 'Maya Chen',
      email: 'maya.chen@mail.com',
      status: 'active',
      admissionDate: '2026-02-01T00:00:00.000Z',
      doctorId: doctor.id,
      doctor: { id: doctor.id, name: 'Dr. Lena Okafor', specialization: 'Neurology' },
    });
    expect(res.body.data).not.toHaveProperty('searchKey');
    expect(res.body.data).not.toHaveProperty('_id');
    expect(res.body.data).not.toHaveProperty('__v');
  });

  it('defaults status to active and returns empty optional fields as null', async () => {
    const { status, email, notes, ...body } = patientPayload({ doctorId: doctor.id });

    const omitted = await api.create(body);
    expect(omitted.body.data).toMatchObject({ status: 'active', email: null, notes: null });

    const blank = await api.create({ ...body, email: '', notes: '   ' });
    expect(blank.status).toBe(201);
    expect(blank.body.data).toMatchObject({ email: null, notes: null });
  });

  it('reports every invalid field', async () => {
    const res = await api.create({
      name: 'X',
      age: 130,
      gender: 'robot',
      phone: 'abc',
      email: 'nope',
      condition: 'Flu',
      status: 'gone',
      admissionDate: '2999-01-01',
      notes: 'x'.repeat(1001),
    });

    expect(res.status).toBe(400);
    expect(errorPaths(res)).toEqual([
      'admissionDate',
      'age',
      'condition',
      'doctorId',
      'email',
      'gender',
      'name',
      'notes',
      'phone',
      'status',
    ]);
    expect(res.body.error.details).toContainEqual({ path: 'doctorId', message: 'Choose a doctor' });
  });

  it('returns 404 DOCTOR_NOT_FOUND for an unknown doctor and 400 for a malformed doctorId', async () => {
    const unknown = await api.create(patientPayload({ doctorId: UNKNOWN_ID }));
    expect(unknown.status).toBe(404);
    expect(unknown.body.error).toMatchObject({ code: 'DOCTOR_NOT_FOUND', details: { fields: ['doctorId'] } });

    const malformed = await api.create(patientPayload({ doctorId: 'abc' }));
    expect(malformed.status).toBe(400);
    expect(errorPaths(malformed)).toEqual(['doctorId']);

    expect(await PatientModel.countDocuments()).toBe(0);
  });
});

describe('POST /api/doctors/:id/patients', () => {
  it('creates the patient under the doctor in the path, ignoring a body doctorId', async () => {
    const other = await createDoctor();

    const res = await api.createForDoctor(doctor.id, patientPayload({ doctorId: other.id }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ doctorId: doctor.id, doctor: { id: doctor.id } });

    expect((await api.getDoctor(doctor.id)).body.data.patientCount).toBe(1);
    expect((await api.getDoctor(other.id)).body.data.patientCount).toBe(0);
  });

  it('returns 404 for an unknown doctor and 400 for a malformed id', async () => {
    const unknown = await api.createForDoctor(UNKNOWN_ID, patientPayload());
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe('NOT_FOUND');

    expect((await api.createForDoctor('not-an-id', patientPayload())).status).toBe(400);
  });
});

describe('GET /api/patients', () => {
  it('paginates with stable ordering and correct meta', async () => {
    for (let i = 1; i <= 5; i++) await createPatient(doctor.id, { name: `Patient ${i}` });

    const page1 = await api.list('?limit=2&page=1&sort=name');
    const page3 = await api.list('?limit=2&page=3&sort=name');

    expect(page1.body.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
    expect(names(page1)).toEqual(['Patient 1', 'Patient 2']);
    expect(names(page3)).toEqual(['Patient 5']);
  });

  it('sorts by admission date (newest first by default), name and creation time', async () => {
    await createPatient(doctor.id, { name: 'Old', admissionDate: '2025-01-05' });
    await createPatient(doctor.id, { name: 'New', admissionDate: '2026-06-20' });
    await createPatient(doctor.id, { name: 'Mid', admissionDate: '2025-09-10' });

    expect(names(await api.list())).toEqual(['New', 'Mid', 'Old']);
    expect(names(await api.list('?sort=admissionDate'))).toEqual(['Old', 'Mid', 'New']);
    expect(names(await api.list('?sort=-name'))).toEqual(['Old', 'New', 'Mid']);
    expect(names(await api.list('?sort=-createdAt'))).toEqual(['Mid', 'New', 'Old']);
  });

  it("includes each row's doctor", async () => {
    const other = await createDoctor({ name: 'Dr. Samir Haddad', specialization: 'Cardiology' });
    await createPatient(doctor.id, { name: 'Alpha' });
    await createPatient(other.id, { name: 'Bravo' });
    await createPatient(other.id, { name: 'Charlie' });

    const res = await api.list('?sort=name');
    expect(res.body.data.map((p: PatientRow) => [p.name, p.doctor?.name, p.doctor?.specialization])).toEqual([
      ['Alpha', 'Dr. Lena Okafor', 'Neurology'],
      ['Bravo', 'Dr. Samir Haddad', 'Cardiology'],
      ['Charlie', 'Dr. Samir Haddad', 'Cardiology'],
    ]);
  });

  it('searches by any name word, email or phone, case-insensitively', async () => {
    await createPatient(doctor.id, { name: 'Maya Chen', email: 'maya@mail.com', phone: '+1 (555) 222-3333' });
    await createPatient(doctor.id, { name: 'Omar Farouk', email: 'omar@mail.com', phone: '+1 555 444 5555' });

    expect(names(await api.list('?search=CHE'))).toEqual(['Maya Chen']);
    expect(names(await api.list('?search=omar@'))).toEqual(['Omar Farouk']);
    expect(names(await api.list('?search=1-555-444'))).toEqual(['Omar Farouk']);
    expect(names(await api.list('?search=maya%20ch'))).toEqual(['Maya Chen']);
    expect(names(await api.list('?search=maya%20farouk'))).toEqual([]);

    const regexChars = await api.list('?search=.*(');
    expect(regexChars.status).toBe(200);
    expect(regexChars.body.data).toEqual([]);
  });

  it('filters by condition, status, gender, doctor and admission date', async () => {
    const other = await createDoctor();
    await createPatient(doctor.id, {
      name: 'Asthma Female',
      condition: 'Asthma',
      status: 'active',
      gender: 'female',
      admissionDate: '2026-03-15',
    });
    await createPatient(other.id, {
      name: 'Diabetes Male',
      condition: 'Diabetes',
      status: 'recovered',
      gender: 'male',
      admissionDate: '2025-08-01',
    });

    expect(names(await api.list('?condition=Diabetes'))).toEqual(['Diabetes Male']);
    expect(names(await api.list('?status=recovered'))).toEqual(['Diabetes Male']);
    expect(names(await api.list('?gender=female'))).toEqual(['Asthma Female']);
    expect(names(await api.list(`?doctorId=${other.id}`))).toEqual(['Diabetes Male']);
    expect(names(await api.list('?admittedFrom=2026-01-01&admittedTo=2026-12-31'))).toEqual(['Asthma Female']);
    expect(names(await api.list('?admittedTo=2025-08-01'))).toEqual(['Diabetes Male']);
    expect(names(await api.list(`?doctorId=${doctor.id}&condition=Asthma`))).toEqual(['Asthma Female']);
    expect(names(await api.list(`?doctorId=${doctor.id}&condition=Diabetes`))).toEqual([]);
    expect(names(await api.list('?condition=&status=&gender=&doctorId=&admittedFrom='))).toHaveLength(2);
  });

  it('rejects invalid query values', async () => {
    for (const query of [
      '?limit=51',
      '?page=0',
      '?condition=Flu',
      '?status=gone',
      '?gender=robot',
      '?doctorId=abc',
      '?sort=age',
      '?admittedFrom=05/01/2026',
      '?admittedFrom=2026-05-01&admittedTo=2026-01-01',
    ]) {
      const res = await api.list(query);
      expect(res.status, query).toBe(400);
    }
  });

  it('ignores operator-style query keys instead of passing them to MongoDB', async () => {
    await createPatient(doctor.id);
    const res = await api.list('?doctorId[$ne]=x&condition[$in]=Asthma&search[$regex]=.*');

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
  });
});

describe('GET /api/doctors/:id/patients', () => {
  it("lists only that doctor's patients, with filters, ignoring a doctorId query", async () => {
    const other = await createDoctor();
    await createPatient(doctor.id, { name: 'Mine A', condition: 'Asthma' });
    await createPatient(doctor.id, { name: 'Mine B', condition: 'Migraine' });
    await createPatient(other.id, { name: 'Theirs' });

    const res = await api.listForDoctor(doctor.id, '?sort=name');
    expect(res.status).toBe(200);
    expect(names(res)).toEqual(['Mine A', 'Mine B']);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data.every((p: PatientRow) => p.doctor?.id === doctor.id)).toBe(true);

    expect(names(await api.listForDoctor(doctor.id, '?condition=Migraine'))).toEqual(['Mine B']);
    expect(names(await api.listForDoctor(doctor.id, `?doctorId=${other.id}&sort=name`))).toEqual(['Mine A', 'Mine B']);
  });

  it('returns an empty page for a doctor without patients, 404 for an unknown doctor, 400 for a bad id', async () => {
    const empty = await api.listForDoctor(doctor.id);
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } });

    expect((await api.listForDoctor(UNKNOWN_ID)).status).toBe(404);
    expect((await api.listForDoctor('not-an-id')).status).toBe(400);
    expect((await api.listForDoctor(doctor.id, '?gender=robot')).status).toBe(400);
  });
});

describe('GET /api/patients/:id', () => {
  it('returns the patient with its doctor', async () => {
    const patient = await createPatient(doctor.id, { name: 'Maya Chen' });

    const res = await api.get(patient.id);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: patient.id, name: 'Maya Chen', doctor: { id: doctor.id } });
  });

  it('returns 404 for an unknown id and 400 for a malformed one', async () => {
    expect((await api.get(UNKNOWN_ID)).status).toBe(404);
    const malformed = await api.get('not-an-id');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/patients/:id', () => {
  it('updates only the given fields and keeps search in sync', async () => {
    const patient = await createPatient(doctor.id, { name: 'Old Name', status: 'under_treatment' });

    const res = await api.update(patient.id, { name: 'Brand New' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'Brand New', status: 'under_treatment', doctorId: doctor.id });

    expect(names(await api.list('?search=brand'))).toEqual(['Brand New']);
    expect(names(await api.list('?search=old'))).toEqual([]);
  });

  it('reassigns the patient to another doctor', async () => {
    const other = await createDoctor({ name: 'Dr. Samir Haddad', specialization: 'Cardiology' });
    const patient = await createPatient(doctor.id);

    const res = await api.update(patient.id, { doctorId: other.id });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      doctorId: other.id,
      doctor: { id: other.id, name: 'Dr. Samir Haddad', specialization: 'Cardiology' },
    });

    expect((await api.getDoctor(doctor.id)).body.data.patientCount).toBe(0);
    expect((await api.getDoctor(other.id)).body.data.patientCount).toBe(1);
    expect(names(await api.listForDoctor(other.id))).toEqual([patient.name]);
  });

  it('rejects reassignment to an unknown doctor and leaves the patient unchanged', async () => {
    const patient = await createPatient(doctor.id);

    const res = await api.update(patient.id, { doctorId: UNKNOWN_ID, name: 'Should Not Save' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('DOCTOR_NOT_FOUND');

    expect((await api.get(patient.id)).body.data).toMatchObject({ name: patient.name, doctorId: doctor.id });
  });

  it('clears optional fields sent as an empty string or null', async () => {
    const patient = await createPatient(doctor.id, { email: 'clear.me@test.dev', notes: 'Some notes' });

    const res = await api.update(patient.id, { email: '', notes: null });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: null, notes: null });

    const stored = await PatientModel.findById(patient.id).select('+searchKey').lean();
    expect(stored).not.toHaveProperty('email');
    expect(stored).not.toHaveProperty('notes');
    expect(stored?.searchKey).not.toContain('clear.me@test.dev');
  });

  it('rejects an empty body, invalid values and required fields set to null', async () => {
    const patient = await createPatient(doctor.id);

    expect((await api.update(patient.id, {})).status).toBe(400);

    const res = await api.update(patient.id, { age: -1, name: null, admissionDate: '2999-01-01', doctorId: null });
    expect(res.status).toBe(400);
    expect(errorPaths(res)).toEqual(['admissionDate', 'age', 'doctorId', 'name']);
  });

  it('returns 404 for an unknown patient', async () => {
    expect((await api.update(UNKNOWN_ID, { name: 'Nobody Here' })).status).toBe(404);
  });
});

describe('DELETE /api/patients/:id', () => {
  it('deletes the patient, then returns 404, and the doctor can still be deleted', async () => {
    const patient = await createPatient(doctor.id);

    expect((await api.remove(patient.id)).status).toBe(204);
    expect((await api.get(patient.id)).status).toBe(404);
    expect((await api.remove(patient.id)).status).toBe(404);

    const deleteDoctor = await request(app).delete(`/api/doctors/${doctor.id}`).set('Cookie', cookie);
    expect(deleteDoctor.status).toBe(200);
    expect(deleteDoctor.body.data).toEqual({ unassigned: 0 });
  });

  it('returns 400 for a malformed id', async () => {
    expect((await api.remove('not-an-id')).status).toBe(400);
  });
});
