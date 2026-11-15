import { z } from 'zod';
import { DOCTOR_STATUSES, SPECIALIZATIONS, WEEKDAYS } from '../../constants/enums.js';
import { imageUrlSchema } from '../../lib/cloudinary.js';
import {
  clearableField,
  dateOnlySchema,
  emailSchema,
  optionalQuery,
  paginationFields,
  pastDateSchema,
  personNameSchema,
  phoneSchema,
  rangeIsOrdered,
  searchField,
  timeSchema,
} from '../../lib/schemas.js';

/** Parts of the day, by when the chamber starts: before 12:00, 12:00–16:59, from 17:00. */
export const CHAMBER_SHIFTS = ['morning', 'afternoon', 'evening'] as const;

const doctorFields = {
  name: personNameSchema,
  specialization: z.enum(SPECIALIZATIONS, 'Choose a specialization'),
  hospital: z.string('Hospital is required').trim().min(2, 'Hospital is too short').max(120, 'Hospital is too long'),
  phone: phoneSchema,
  email: emailSchema,
  status: z.enum(DOCTOR_STATUSES, 'Choose a status'),
  yearsOfExperience: z
    .number('Enter years of experience')
    .int('Use whole years')
    .min(0, 'Cannot be negative')
    .max(60, 'Must be 60 or less'),
  joinedAt: pastDateSchema,
  photoUrl: imageUrlSchema,
  qualifications: clearableField(z.string().trim().max(200, 'Keep it under 200 characters')),
  degrees: z
    .array(
      z.object({
        title: z.string('Enter the degree').trim().min(2, 'Enter the degree').max(60, 'Keep it under 60 characters'),
        institute: z.string('Enter the institute').trim().min(2, 'Enter the institute').max(120, 'Keep it under 120 characters'),
        year: z.number('Enter the year').int('Use a year like 2010').min(1950, 'Year is too early').max(new Date().getFullYear(), 'Year cannot be in the future'),
      }),
    )
    .max(10, 'Up to 10 degrees')
    // Oldest first.
    .transform((degrees) => [...degrees].sort((a, b) => a.year - b.year)),
  registrationNo: clearableField(z.string().trim().max(30, 'Keep it under 30 characters')),
  consultationFee: clearableField(z.number('Enter the fee').int('Use a whole amount').min(0, 'Cannot be negative').max(100_000, 'Must be 100,000 or less')),
  bio: clearableField(z.string().trim().max(600, 'Keep it under 600 characters')),
  chamberRoom: clearableField(z.string().trim().max(120, 'Keep it under 120 characters')),
  chamberDays: z
    .array(z.enum(WEEKDAYS, 'Choose valid days'))
    .max(7)
    // Stored in week order (Saturday first), without duplicates.
    .transform((days) => WEEKDAYS.filter((day) => days.includes(day))),
  chamberStart: clearableField(timeSchema),
  chamberEnd: clearableField(timeSchema),
};

/** Chamber hours must end after they start (when both are given in the same request). */
const chamberHoursOrdered = (body: { chamberStart?: string; chamberEnd?: string }) =>
  !body.chamberStart || !body.chamberEnd || body.chamberEnd > body.chamberStart;
const HOURS_ISSUE = { path: ['chamberEnd'], message: 'End time must be after the start time' };

export const createDoctorSchema = z
  .object({
    ...doctorFields,
    status: doctorFields.status.default('active'),
    photoUrl: imageUrlSchema.default(null),
    chamberDays: doctorFields.chamberDays.default([]),
    degrees: doctorFields.degrees.default([]),
  })
  .refine(chamberHoursOrdered, HOURS_ISSUE);

// No defaults here: a missing field must stay missing, not reset to its default.
export const updateDoctorSchema = z
  .object(doctorFields)
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update')
  .refine(chamberHoursOrdered, HOURS_ISSUE);

export const DOCTOR_SORTS = [
  '-createdAt',
  'createdAt',
  'name',
  '-name',
  '-joinedAt',
  'joinedAt',
  '-yearsOfExperience',
  'yearsOfExperience',
] as const;

export const listDoctorsQuerySchema = z
  .object({
    ...paginationFields,
    search: searchField,
    specialization: optionalQuery(z.enum(SPECIALIZATIONS)),
    hospital: optionalQuery(z.string().trim().max(120)),
    status: optionalQuery(z.enum(DOCTOR_STATUSES)),
    // Chamber schedule: doctors who sit on this day ("today" = today in APP_TIMEZONE), in this part of the day.
    day: optionalQuery(z.enum([...WEEKDAYS, 'today'])),
    shift: optionalQuery(z.enum(CHAMBER_SHIFTS)),
    joinedFrom: optionalQuery(dateOnlySchema),
    joinedTo: optionalQuery(dateOnlySchema),
    expMin: optionalQuery(z.coerce.number().int().min(0).max(60)),
    expMax: optionalQuery(z.coerce.number().int().min(0).max(60)),
    sort: optionalQuery(z.enum(DOCTOR_SORTS)).transform((sort) => sort ?? '-createdAt'),
  })
  .refine((q) => rangeIsOrdered(q.joinedFrom, q.joinedTo), {
    path: ['joinedTo'],
    message: 'End date must be on or after the start date',
  })
  .refine((q) => rangeIsOrdered(q.expMin, q.expMax), {
    path: ['expMax'],
    message: 'Maximum experience must be at least the minimum',
  });

export const doctorOptionsQuerySchema = z.object({ search: searchField });

export type CreateDoctorInput = z.output<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.output<typeof updateDoctorSchema>;
export type ListDoctorsQuery = z.output<typeof listDoctorsQuerySchema>;
export type DoctorSort = (typeof DOCTOR_SORTS)[number];
