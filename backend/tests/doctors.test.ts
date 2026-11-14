import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { PatientModel } from '../src/modules/patients/patient.model.js';
import { doctorPayload, insertPatients, loginAsAdmin } from './helpers.js';

const app = createApp();
let cookie: string;

const api = {
  list: (query = '') => request(app).get(`/api/doctors${query}`).set('Cookie', cookie),
  get: (id: string) => request(app).get(`/api/doctors/${id}`).set('Cookie', cookie),
  create: (body: object) => request(app).post('/api/doctors').set('Cookie', cookie).send(body),
  update: (id: string, body: object) => request(app).patch(`/api/doctors/${id}`).set('Cookie', cookie).send(body),
  remove: (id: string) => request(app).delete(`/api/doctors/${id}`).set('Cookie', cookie),
};

async function createDoctor(overrides: Record<string, unknown> = {}) {
  const res = await api.create(doctorPayload(overrides));
  expect(res.status).toBe(201);
  return res.body.data as { id: string; name: string; email: string };
}

const names = (res: request.Response) => res.body.data.map((d: { name: string }) => d.name);

beforeEach(async () => {
  cookie = await loginAsAdmin(app);
});

describe('auth on /api/doctors', () => {
  it('rejects requests without a session', async () => {
    const res = await request(app).get('/api/doctors');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/doctors', () => {
  it('creates a doctor and returns it without internal fields', async () => {
    const res = await api.create(doctorPayload({ name: 'Dr. Lena Okafor', email: 'Lena.Okafor@City.org' }));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      id: expect.any(String),
      name: 'Dr. Lena Okafor',
      email: 'lena.okafor@city.org',
      status: 'active',
      patientCount: 0,
    });
    expect(res.body.data).not.toHaveProperty('searchKey');
    expect(res.body.data).not.toHaveProperty('_id');
    expect(res.body.data).not.toHaveProperty('__v');
  });

  it('defaults status to active', async () => {
    const { status, ...body } = doctorPayload();
    const res = await api.create(body);
    expect(res.body.data.status).toBe('active');
  });

  it('reports every invalid field', async () => {
    const res = await api.create({
      name: 'X',
      specialization: 'Wizardry',
      hospital: '',
      phone: 'abc',
      email: 'nope',
      yearsOfExperience: -1,
      joinedAt: '2999-01-01',
    });

    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path).sort();
    expect(paths).toEqual(['email', 'hospital', 'joinedAt', 'name', 'phone', 'specialization', 'yearsOfExperience']);
  });

  it('rejects a duplicate email regardless of case', async () => {
    await createDoctor({ email: 'same@test.dev' });
    const res = await api.create(doctorPayload({ email: 'SAME@test.dev' }));

    expect(res.status).toBe(409);
    expect(res.body.error.details.fields).toEqual(['email']);
  });
});

describe('GET /api/doctors', () => {
  it('paginates with stable ordering and correct meta', async () => {
    for (let i = 1; i <= 5; i++) await createDoctor({ name: `Dr. Page ${i}` });

    const page1 = await api.list('?limit=2&page=1&sort=name');
    const page3 = await api.list('?limit=2&page=3&sort=name');

    expect(page1.body.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
    expect(names(page1)).toEqual(['Dr. Page 1', 'Dr. Page 2']);
    expect(names(page3)).toEqual(['Dr. Page 5']);
  });

  it('sorts newest first by default', async () => {
    await createDoctor({ name: 'Dr. First' });
    await createDoctor({ name: 'Dr. Second' });

    expect(names(await api.list())).toEqual(['Dr. Second', 'Dr. First']);
  });

  it('searches by any name word, email or phone, case-insensitively', async () => {
    await createDoctor({ name: 'Dr. Lena Okafor', email: 'lena@city.org', phone: '+1 (555) 123-4567' });
    await createDoctor({ name: 'Dr. Samir Haddad', email: 'samir@north.org', phone: '+1 555 987 6543' });

    expect(names(await api.list('?search=OKA'))).toEqual(['Dr. Lena Okafor']);
    expect(names(await api.list('?search=lena'))).toEqual(['Dr. Lena Okafor']);
    expect(names(await api.list('?search=samir@'))).toEqual(['Dr. Samir Haddad']);
    expect(names(await api.list('?search=1555987'))).toEqual(['Dr. Samir Haddad']);
    expect(names(await api.list('?search=lena%20oka'))).toEqual(['Dr. Lena Okafor']);
    expect(names(await api.list('?search=lena%20haddad'))).toEqual([]);
  });

  it('treats regex characters in the search as plain text', async () => {
    await createDoctor();
    const res = await api.list('?search=.*(');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('filters by specialization, status, hospital, joined date and experience', async () => {
    await createDoctor({ name: 'Dr. Cardio', specialization: 'Cardiology', yearsOfExperience: 5, joinedAt: '2020-06-01' });
    await createDoctor({ name: 'Dr. Neuro', specialization: 'Neurology', status: 'on_leave', hospital: 'St. Mary', yearsOfExperience: 20, joinedAt: '2024-02-10' });

    expect(names(await api.list('?specialization=Neurology'))).toEqual(['Dr. Neuro']);
    expect(names(await api.list('?status=on_leave'))).toEqual(['Dr. Neuro']);
    expect(names(await api.list('?hospital=St.%20Mary'))).toEqual(['Dr. Neuro']);
    expect(names(await api.list('?joinedFrom=2024-01-01&joinedTo=2024-12-31'))).toEqual(['Dr. Neuro']);
    expect(names(await api.list('?joinedTo=2020-06-01'))).toEqual(['Dr. Cardio']);
    expect(names(await api.list('?expMin=10'))).toEqual(['Dr. Neuro']);
    expect(names(await api.list('?expMin=1&expMax=6'))).toEqual(['Dr. Cardio']);
    expect(names(await api.list('?specialization=&status='))).toHaveLength(2);
  });

  it('rejects invalid query values', async () => {
    for (const query of ['?limit=51', '?page=0', '?specialization=Wizardry', '?sort=password', '?joinedFrom=2024-05-01&joinedTo=2024-01-01', '?expMin=10&expMax=2']) {
      const res = await api.list(query);
      expect(res.status, query).toBe(400);
    }
  });

  it('ignores operator-style query keys instead of passing them to MongoDB', async () => {
    await createDoctor();
    const res = await api.list('?status[$ne]=active&search[$regex]=.*');

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
  });

  it('includes patient counts for each doctor on the page', async () => {
    const busy = await createDoctor({ name: 'Dr. Busy' });
    const quiet = await createDoctor({ name: 'Dr. Quiet' });
    await insertPatients(busy.id, 3);

    const res = await api.list('?sort=name');
    expect(res.body.data.map((d: { name: string; patientCount: number }) => [d.name, d.patientCount])).toEqual([
      ['Dr. Busy', 3],
      ['Dr. Quiet', 0],
    ]);
    expect(quiet.id).toBeTruthy();
  });
});

describe('GET /api/doctors/:id', () => {
  it('returns the doctor with its patient count', async () => {
    const doctor = await createDoctor();
    await insertPatients(doctor.id, 2);

    const res = await api.get(doctor.id);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: doctor.id, patientCount: 2 });
  });

  it('returns 404 for an unknown id and 400 for a malformed one', async () => {
    expect((await api.get('64b7f0000000000000000000')).status).toBe(404);
    const malformed = await api.get('not-an-id');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/doctors/:id', () => {
  it('updates only the given fields and keeps search in sync', async () => {
    const doctor = await createDoctor({ name: 'Dr. Old Name', status: 'on_leave' });

    const res = await api.update(doctor.id, { name: 'Dr. Brand New' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'Dr. Brand New', status: 'on_leave' });

    expect(names(await api.list('?search=brand'))).toEqual(['Dr. Brand New']);
    expect(names(await api.list('?search=old'))).toEqual([]);
  });

  it('rejects an empty update and a duplicate email', async () => {
    const a = await createDoctor({ email: 'a@test.dev' });
    await createDoctor({ email: 'b@test.dev' });

    expect((await api.update(a.id, {})).status).toBe(400);
    expect((await api.update(a.id, { email: 'b@test.dev' })).status).toBe(409);
  });

  it('returns 404 for an unknown doctor', async () => {
    const res = await api.update('64b7f0000000000000000000', { name: 'Dr. Nobody' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/doctors/:id', () => {
  it('refuses while the doctor has patients, then deletes once they are gone', async () => {
    const doctor = await createDoctor();
    await insertPatients(doctor.id, 2);

    const blocked = await api.remove(doctor.id);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toMatchObject({ code: 'DOCTOR_HAS_PATIENTS', details: { patientCount: 2 } });

    await PatientModel.deleteMany({ doctorId: doctor.id });

    expect((await api.remove(doctor.id)).status).toBe(204);
    expect((await api.get(doctor.id)).status).toBe(404);
  });

  it('returns 404 for an unknown doctor', async () => {
    expect((await api.remove('64b7f0000000000000000000')).status).toBe(404);
  });
});

describe('lookup endpoints', () => {
  it('GET /hospitals returns distinct hospitals in alphabetical order', async () => {
    await createDoctor({ hospital: 'Northside Clinic' });
    await createDoctor({ hospital: 'City General' });
    await createDoctor({ hospital: 'City General' });

    const res = await request(app).get('/api/doctors/hospitals').set('Cookie', cookie);
    expect(res.body.data).toEqual(['City General', 'Northside Clinic']);
  });

  it('GET /options returns id, name and specialization, filtered by search', async () => {
    await createDoctor({ name: 'Dr. Lena Okafor', specialization: 'Neurology' });
    await createDoctor({ name: 'Dr. Samir Haddad' });

    const res = await request(app).get('/api/doctors/options?search=oka').set('Cookie', cookie);
    expect(res.body.data).toEqual([{ id: expect.any(String), name: 'Dr. Lena Okafor', specialization: 'Neurology' }]);
  });
});
