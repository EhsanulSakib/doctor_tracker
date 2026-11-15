import { createHash } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { cookiesFrom, doctorPayload, loginAsAdmin } from './helpers.js';

const app = createApp();
const PHOTO = 'https://res.cloudinary.com/test-cloud/image/upload/v1/doctor-tracker/doctors/abc.jpg';

describe('POST /api/uploads/signature', () => {
  it('signs a direct upload into the right folder', async () => {
    const cookie = await loginAsAdmin(app);
    const res = await request(app).post('/api/uploads/signature').set('Cookie', cookie).send({ kind: 'doctor' });

    expect(res.status).toBe(200);
    const { cloudName, apiKey, timestamp, folder, signature } = res.body.data;
    expect({ cloudName, apiKey, folder }).toEqual({ cloudName: 'test-cloud', apiKey: '123456789', folder: 'doctor-tracker/doctors' });
    const expected = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}test-cloudinary-secret`).digest('hex');
    expect(signature).toBe(expected);
  });

  it('refuses the demo account', async () => {
    const demo = cookiesFrom(await request(app).post('/api/auth/demo'));
    const res = await request(app).post('/api/uploads/signature').set('Cookie', `dt_access=${demo.dt_access?.value}`).send({ kind: 'avatar' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('DEMO_READ_ONLY');
  });
});

describe('photo URLs', () => {
  it('stores an optional doctor photo from our Cloudinary account, and can remove it', async () => {
    const cookie = await loginAsAdmin(app);

    const plain = await request(app).post('/api/doctors').set('Cookie', cookie).send(doctorPayload());
    expect(plain.status).toBe(201);
    expect(plain.body.data.photoUrl).toBeNull();

    const withPhoto = await request(app).patch(`/api/doctors/${plain.body.data.id}`).set('Cookie', cookie).send({ photoUrl: PHOTO });
    expect(withPhoto.body.data.photoUrl).toBe(PHOTO);

    const removed = await request(app).patch(`/api/doctors/${plain.body.data.id}`).set('Cookie', cookie).send({ photoUrl: null });
    expect(removed.body.data.photoUrl).toBeNull();
  });

  it('rejects images that are not from our Cloudinary account', async () => {
    const cookie = await loginAsAdmin(app);
    const res = await request(app)
      .post('/api/doctors')
      .set('Cookie', cookie)
      .send(doctorPayload({ photoUrl: 'https://evil.example.com/a.jpg' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('updates the admin avatar on its own', async () => {
    const cookie = await loginAsAdmin(app);
    const avatar = PHOTO.replace('doctors', 'admins');
    const res = await request(app).patch('/api/auth/me').set('Cookie', cookie).send({ avatarUrl: avatar });
    expect(res.status).toBe(200);
    expect(res.body.data.user.avatarUrl).toBe(avatar);
  });
});
