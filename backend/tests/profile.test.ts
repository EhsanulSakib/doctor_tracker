import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { ADMIN, cookiesFrom, loginAsAdmin } from './helpers.js';

const app = createApp();

describe('PATCH /api/auth/me', () => {
  it('updates the name but never the email (the sign-in identity)', async () => {
    const cookie = await loginAsAdmin(app);
    const res = await request(app).patch('/api/auth/me').set('Cookie', cookie).send({ name: 'Head Admin', email: 'someone-else@test.dev' });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ name: 'Head Admin', email: ADMIN.email, role: 'admin' });
  });

  it('rejects a request with nothing it can change', async () => {
    const cookie = await loginAsAdmin(app);
    const res = await request(app).patch('/api/auth/me').set('Cookie', cookie).send({ email: 'someone-else@test.dev' });
    expect(res.status).toBe(400);
  });

  it('is read-only for the demo account', async () => {
    const demo = cookiesFrom(await request(app).post('/api/auth/demo'));
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Cookie', `dt_access=${demo.dt_access?.value}`)
      .send({ name: 'Hacked', email: 'demo@doctortracker.dev' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('DEMO_READ_ONLY');
  });
});

describe('POST /api/auth/me/password', () => {
  it('requires the current password', async () => {
    const cookie = await loginAsAdmin(app);
    const res = await request(app).post('/api/auth/me/password').set('Cookie', cookie).send({ currentPassword: 'wrong-one', newPassword: 'Brand!New2026' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WRONG_PASSWORD');
  });

  it('changes the password, keeps this browser signed in and ends other sessions', async () => {
    const cookie = await loginAsAdmin(app);
    const res = await request(app).post('/api/auth/me/password').set('Cookie', cookie).send({ currentPassword: ADMIN.password, newPassword: 'Brand!New2026' });

    expect(res.status).toBe(200);
    expect(cookiesFrom(res).dt_refresh?.value).toBeTruthy();

    // The old refresh token was revoked.
    const oldRefresh = cookie.split('dt_refresh=')[1];
    expect((await request(app).post('/api/auth/refresh').set('Cookie', `dt_refresh=${oldRefresh}`)).status).toBe(401);

    expect((await request(app).post('/api/auth/login').send({ email: ADMIN.email, password: ADMIN.password })).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({ email: ADMIN.email, password: 'Brand!New2026' })).status).toBe(200);
  });
});
