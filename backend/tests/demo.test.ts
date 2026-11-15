import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { cookiesFrom, doctorPayload, loginAsAdmin } from './helpers.js';

const app = createApp();

async function loginAsDemo() {
  const res = await request(app).post('/api/auth/demo');
  const cookies = cookiesFrom(res);
  return { res, cookie: `dt_access=${cookies.dt_access?.value}; dt_refresh=${cookies.dt_refresh?.value}` };
}

describe('POST /api/auth/demo', () => {
  it('signs in the demo account (created on first use) with the demo role', async () => {
    const first = await loginAsDemo();
    expect(first.res.status).toBe(200);
    expect(first.res.body.data.user).toMatchObject({ role: 'demo', email: 'demo@doctortracker.dev' });

    const second = await loginAsDemo();
    expect(second.res.body.data.user.id).toBe(first.res.body.data.user.id);
  });

  it('cannot be used through the password login', async () => {
    await loginAsDemo();
    const res = await request(app).post('/api/auth/login').send({ email: 'demo@doctortracker.dev', password: 'anything-at-all' });
    expect(res.status).toBe(401);
  });
});

describe('demo account permissions', () => {
  it('can read every resource', async () => {
    const { cookie } = await loginAsDemo();
    for (const path of ['/api/doctors', '/api/patients', '/api/dashboard/stats', '/api/notifications', '/api/auth/me']) {
      const res = await request(app).get(path).set('Cookie', cookie);
      expect(res.status, path).toBe(200);
    }
  });

  it('is rejected with 403 DEMO_READ_ONLY on every write', async () => {
    const admin = await loginAsAdmin(app);
    const created = await request(app).post('/api/doctors').set('Cookie', admin).send(doctorPayload());
    const id = created.body.data.id as string;

    const { cookie } = await loginAsDemo();
    const writes = [
      request(app).post('/api/doctors').set('Cookie', cookie).send(doctorPayload()),
      request(app).patch(`/api/doctors/${id}`).set('Cookie', cookie).send({ name: 'Dr. Changed' }),
      request(app).delete(`/api/doctors/${id}`).set('Cookie', cookie),
      request(app).post('/api/patients').set('Cookie', cookie).send({}),
      request(app).post('/api/notifications/read-all').set('Cookie', cookie),
    ];

    for (const res of await Promise.all(writes)) {
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DEMO_READ_ONLY');
    }

    const after = await request(app).get(`/api/doctors/${id}`).set('Cookie', admin);
    expect(after.body.data.name).toBe(created.body.data.name);
  });

  it('leaves the main admin free to write', async () => {
    const admin = await loginAsAdmin(app);
    const res = await request(app).post('/api/doctors').set('Cookie', admin).send(doctorPayload());
    expect(res.status).toBe(201);
  });
});
