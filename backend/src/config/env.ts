import { existsSync } from 'node:fs';
import { z } from 'zod';

// Local development reads backend/.env. In production the platform injects env vars,
// and tests set their own values in vitest.config.ts.
if (process.env.NODE_ENV !== 'test' && existsSync('.env')) {
  process.loadEnvFile('.env');
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8082),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  // Only used by `npm run db:sync`: the database kept in sync with MONGODB_URI.
  SYNC_TARGET_URI: z.string().min(1).optional(),
  FRONTEND_URL: z.url().default('http://localhost:3000'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(10).max(86_400).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),

  // Number of reverse proxies in front of the API (Render, Vercel rewrite...).
  // Needed so rate limiting sees the real client IP instead of the proxy's.
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),

  ADMIN_NAME: z.string().min(2).default('Clinic Admin'),
  ADMIN_EMAIL: z.email().default('admin@doctortracker.dev'),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  // The read-only showcase account behind the "Demo login" button (created on first use).
  DEMO_NAME: z.string().min(2).default('Demo Admin'),
  DEMO_EMAIL: z.email().default('demo@doctortracker.dev'),

  // Cloudinary (photo uploads). Leave unset to disable uploads; photos are always optional.
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  CLOUDINARY_FOLDER: z.string().min(1).default('doctor-tracker'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // The clinic's timezone. Decides what "today" is for date-only fields and dashboard ranges.
  APP_TIMEZONE: z
    .string()
    .default('Asia/Dhaka')
    .refine((zone) => Intl.supportedValuesOf('timeZone').includes(zone), 'APP_TIMEZONE must be an IANA timezone, e.g. Asia/Dhaka'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(`\nInvalid environment configuration:\n${z.prettifyError(parsed.error)}\n`);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
