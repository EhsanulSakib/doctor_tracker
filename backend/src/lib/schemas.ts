import { z, type ZodType } from 'zod';
import { todayInAppTimezone } from './dates.js';
import { MAX_PAGE_SIZE } from './pagination.js';

/** Treats `?status=` (an empty string from a cleared filter) as "not provided". */
export function optionalQuery<T extends ZodType>(schema: T) {
  return z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), schema.optional());
}

/**
 * An optional body field that can be cleared: `""`, whitespace or `null` mean "no value".
 * On create the field is simply left empty. On update the key stays in the parsed body with
 * the value `undefined`, and Mongoose's `doc.set()` turns that into an `$unset`.
 */
export function clearableField<T extends ZodType>(schema: T) {
  return z.preprocess(
    (value) => (value === null || (typeof value === 'string' && value.trim() === '') ? undefined : value),
    schema.optional(),
  );
}

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const idParamsSchema = z.object({ id: objectIdSchema });

export const paginationFields = {
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(10),
};

export const searchField = optionalQuery(z.string().trim().max(100));

/** `YYYY-MM-DD` from a date filter. Dates are compared in UTC. */
export const dateOnlySchema = z.iso.date('Use the YYYY-MM-DD format');

export const startOfDay = (date: string) => new Date(`${date}T00:00:00.000Z`);
export const endOfDay = (date: string) => new Date(`${date}T23:59:59.999Z`);

/**
 * A date sent in a request body: `YYYY-MM-DD` or a full ISO timestamp, never in the future.
 * A calendar date is compared with today in APP_TIMEZONE (see lib/dates.ts), a timestamp with now.
 */
export const pastDateSchema = z
  .union([z.iso.date(), z.iso.datetime({ offset: true })], 'Enter a valid date')
  .refine(
    (value) => (value.length === 10 ? value <= todayInAppTimezone() : new Date(value).getTime() <= Date.now()),
    'Date cannot be in the future',
  )
  .transform((value) => new Date(value))
  .refine((date) => date.getUTCFullYear() >= 1950, 'Date is too far in the past');

export const emailSchema = z
  .string('Email is required')
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email('Enter a valid email address'));

export const phoneSchema = z
  .string('Phone is required')
  .trim()
  .refine(
    (value) => /^\+?[\d\s()-]{7,20}$/.test(value) && value.replace(/\D/g, '').length >= 7,
    'Enter a valid phone number',
  );

export const personNameSchema = z.string('Name is required').trim().min(2, 'Name is too short').max(80, 'Name is too long');

/** Rejects a range where the start is after the end. */
export function rangeIsOrdered<T extends string | number>(from: T | undefined, to: T | undefined): boolean {
  return from === undefined || to === undefined || from <= to;
}
