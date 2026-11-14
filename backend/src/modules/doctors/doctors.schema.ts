import { z } from 'zod';
import { DOCTOR_STATUSES, SPECIALIZATIONS } from '../../constants/enums.js';
import {
  dateOnlySchema,
  emailSchema,
  optionalQuery,
  paginationFields,
  pastDateSchema,
  personNameSchema,
  phoneSchema,
  rangeIsOrdered,
  searchField,
} from '../../lib/schemas.js';

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
};

export const createDoctorSchema = z.object({
  ...doctorFields,
  status: doctorFields.status.default('active'),
});

// No defaults here: a missing field must stay missing, not reset to its default.
export const updateDoctorSchema = z
  .object(doctorFields)
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update');

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
