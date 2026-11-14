import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { seedAdmin } from '../src/modules/auth/auth.seed.js';
import { RefreshTokenModel } from '../src/modules/auth/refresh-token.model.js';
import { hashToken } from '../src/modules/auth/tokens.js';
import { ADMIN, cookiesFrom } from './helpers.js';

const app = createApp();

async function login() {
  const res = await request(app).post('/api/auth/login').send({ email: ADMIN.email, password: ADMIN.password });
  const cookies = cookiesFrom(res);
  return { res, access: cookies.dt_access!.value, refresh: cookies.dt_refresh!.value };
}

const refreshWith = (token: string) => request(app).post('/api/auth/refresh').set('Cookie', `dt_refresh=${token}`);

describe('POST /api/auth/login', () => {
  beforeEach(() => seedAdmin(ADMIN));

  it('signs in and sets both tokens as httpOnly, SameSite=Lax cookies', async () => {
    const { res } = await login();

    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual({
      id: expect.any(String),
      name: ADMIN.name,
      email: ADMIN.email,
      role: 'admin',
    });

    const cookies = cookiesFrom(res);
    for (const name of ['dt_access', 'dt_refresh']) {
      expect(cookies[name]?.attributes).toMatch(/HttpOnly/);
      expect(cookies[name]?.attributes).toMatch(/SameSite=Lax/);
      expect(cookies[name]?.attributes).toMatch(/Path=\//);
    }
  });

  it('accepts the email in any case and with surrounding spaces', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: `  ${ADMIN.email.toUpperCase()} `, password: ADMIN.password });

    expect(res.status).toBe(200);
  });

  it('returns the same error for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: ADMIN.email, password: 'nope' });
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'ghost@test.dev', password: 'nope' });

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.status).toBe(401);
      expect(res.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' });
      expect(res.headers['set-cookie']).toBeUndefined();
    }
  });

  it('rejects invalid input with field-level details', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual(['email', 'password']);
  });

  it('rejects Mongo operator injection in the body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => seedAdmin(ADMIN));

  it('returns the signed-in user', async () => {
    const { access } = await login();
    const res = await request(app).get('/api/auth/me').set('Cookie', `dt_access=${access}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(ADMIN.email);
  });

  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a tampered token', async () => {
    const { access } = await login();
    const forged = jwt.sign({ role: 'admin' }, 'some-other-secret-that-is-long-enough!!', { subject: 'x' });

    for (const token of [`${access}x`, forged]) {
      const res = await request(app).get('/api/auth/me').set('Cookie', `dt_access=${token}`);
      expect(res.status).toBe(401);
    }
  });

  it('reports an expired token with a distinct code so the client knows to refresh', async () => {
    const expired = jwt.sign(
      { role: 'admin', exp: Math.floor(Date.now() / 1000) - 10 },
      process.env.JWT_ACCESS_SECRET!,
      { subject: '507f1f77bcf86cd799439011', issuer: 'doctor-tracker-api', audience: 'doctor-tracker-web' },
    );
    const res = await request(app).get('/api/auth/me').set('Cookie', `dt_access=${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });
});

describe('POST /api/auth/refresh', () => {
  beforeEach(() => seedAdmin(ADMIN));

  it('rotates both tokens and marks the old refresh token as used', async () => {
    const first = await login();
    const res = await refreshWith(first.refresh);

    expect(res.status).toBe(200);
    const cookies = cookiesFrom(res);
    expect(cookies.dt_refresh?.value).toBeTruthy();
    expect(cookies.dt_refresh?.value).not.toBe(first.refresh);
    expect(cookies.dt_access?.value).toBeTruthy();

    const old = await RefreshTokenModel.findOne({ tokenHash: hashToken(first.refresh) });
    expect(old?.rotatedAt).toBeInstanceOf(Date);
  });

  it('tolerates the same token arriving twice within the grace window (parallel requests)', async () => {
    const { refresh } = await login();

    const [a, b] = await Promise.all([refreshWith(refresh), refreshWith(refresh)]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  });

  it('revokes the whole session when an old token is reused after the grace window', async () => {
    const first = await login();
    const second = await refreshWith(first.refresh);
    const newRefresh = cookiesFrom(second).dt_refresh!.value;

    // Pretend the first token was rotated a minute ago.
    await RefreshTokenModel.updateOne(
      { tokenHash: hashToken(first.refresh) },
      { $set: { rotatedAt: new Date(Date.now() - 60_000) } },
    );

    const replay = await refreshWith(first.refresh);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('SESSION_REVOKED');

    // The legitimate newer token from the same session is dead too.
    const afterTheft = await refreshWith(newRefresh);
    expect(afterTheft.status).toBe(401);
    expect(afterTheft.body.error.code).toBe('SESSION_REVOKED');
  });

  it('rejects a missing or unknown token and clears cookies', async () => {
    const missing = await request(app).post('/api/auth/refresh');
    const unknown = await refreshWith('not-a-real-token');

    for (const res of [missing, unknown]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('SESSION_EXPIRED');
      expect(cookiesFrom(res).dt_refresh?.attributes).toMatch(/Expires=Thu, 01 Jan 1970/);
    }
  });
});

describe('POST /api/auth/logout', () => {
  beforeEach(() => seedAdmin(ADMIN));

  it('clears cookies and ends the session server-side', async () => {
    const { refresh } = await login();

    const res = await request(app).post('/api/auth/logout').set('Cookie', `dt_refresh=${refresh}`);
    expect(res.status).toBe(204);
    expect(cookiesFrom(res).dt_access?.attributes).toMatch(/Expires=Thu, 01 Jan 1970/);

    const reuse = await refreshWith(refresh);
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('SESSION_REVOKED');
  });

  it('succeeds even without a session', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(204);
  });
});

describe('seedAdmin', () => {
  it('is idempotent and resets the password', async () => {
    await seedAdmin(ADMIN);
    await seedAdmin({ ...ADMIN, password: 'An0ther!Password' });

    const oldPassword = await request(app).post('/api/auth/login').send({ email: ADMIN.email, password: ADMIN.password });
    const newPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN.email, password: 'An0ther!Password' });

    expect(oldPassword.status).toBe(401);
    expect(newPassword.status).toBe(200);
  });
});
