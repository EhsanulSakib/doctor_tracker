import type { Express } from 'express';
import request, { type Response } from 'supertest';
import { seedAdmin } from '../src/modules/auth/auth.seed.js';

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
