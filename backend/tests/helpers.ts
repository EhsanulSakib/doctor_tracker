import type { Express } from 'express';
import { Types } from 'mongoose';
import request, { type Response } from 'supertest';
import { seedAdmin } from '../src/modules/auth/auth.seed.js';
import { PatientModel } from '../src/modules/patients/patient.model.js';

let sequence = 0;

/** A valid create-doctor body; every call gets a unique email. */
export function doctorPayload(overrides: Record<string, unknown> = {}) {
  sequence += 1;
  return {
    name: `Dr. Test Doctor ${sequence}`,
    specialization: 'Cardiology',
    hospital: 'City General',
    phone: '+1 555 010 0000',
    email: `doctor${sequence}@test.dev`,
    status: 'active',
    yearsOfExperience: 10,
    joinedAt: '2022-03-15',
    ...overrides,
  };
}

/** Inserts patients straight into the DB (for tests that only need them to exist). */
export async function insertPatients(doctorId: string, count: number) {
  await PatientModel.insertMany(
    Array.from({ length: count }, (_, i) => ({
      name: `Patient ${i + 1}`,
      age: 40,
      gender: 'female' as const,
      phone: '+1 555 020 0000',
      condition: 'Hypertension' as const,
      admissionDate: new Date('2026-01-10'),
      doctorId: new Types.ObjectId(doctorId),
    })),
  );
}

export const ADMIN = { name: 'Test Admin', email: 'admin@test.dev', password: 'Test!Passw0rd' };

/** Parses Set-Cookie headers into `{ name: { value, attributes } }`. */
export function cookiesFrom(res: Response) {
  const header = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookies: Record<string, { value: string; attributes: string }> = {};

  for (const raw of header ?? []) {
    const [pair = '', ...attrs] = raw.split(';');
    const separator = pair.indexOf('=');
    cookies[pair.slice(0, separator).trim()] = {
      value: pair.slice(separator + 1),
      attributes: attrs.join(';').trim(),
    };
  }

  return cookies;
}

/** Seeds the admin and logs in. Returns a Cookie header value for authenticated requests. */
export async function loginAsAdmin(app: Express): Promise<string> {
  await seedAdmin(ADMIN);
  const res = await request(app).post('/api/auth/login').send({ email: ADMIN.email, password: ADMIN.password });
  const cookies = cookiesFrom(res);
  return `dt_access=${cookies.dt_access?.value}; dt_refresh=${cookies.dt_refresh?.value}`;
}
