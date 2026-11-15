import { z } from 'zod';
import { CONDITIONS, GENDERS, PATIENT_STATUSES } from '../../constants/enums.js';
import {
  clearableField,
  dateOnlySchema,
  emailSchema,
  objectIdSchema,
  optionalQuery,
  paginationFields,
  pastDateSchema,
  personNameSchema,
  phoneSchema,
  rangeIsOrdered,
  searchField,
} from '../../lib/schemas.js';

const patientFields = {
  name: personNameSchema,
  age: z.number('Enter an age').int('Use whole years').min(0, 'Cannot be negative').max(120, 'Must be 120 or less'),
  gender: z.enum(GENDERS, 'Choose a gender'),
  phone: phoneSchema,
  // Optional and clearable: send "" or null on update to remove the value.
  email: clearableField(emailSchema),
  condition: z.enum(CONDITIONS, 'Choose a condition'),
  status: z.enum(PATIENT_STATUSES, 'Choose a status'),
  admissionDate: pastDateSchema,
  notes: clearableField(z.string().trim().max(1000, 'Notes must be 1000 characters or less')),
  doctorId: z.string('Choose a doctor').pipe(objectIdSchema),
};

export const createPatientSchema = z.object({
  ...patientFields,
  status: patientFields.status.default('active'),
});

/** `POST /api/doctors/:id/patients`: the doctor comes from the path, so a body `doctorId` is dropped. */
export const createDoctorPatientSchema = createPatientSchema.omit({ doctorId: true });

// No defaults here: a missing field must stay missing, not reset to its default.
// `doctorId` is allowed, which reassigns the patient to another doctor.
export const updatePatientSchema = z
  .object(patientFields)
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update');

export const PATIENT_SORTS = ['-admissionDate', 'admissionDate', 'name', '-name', '-createdAt'] as const;

/** Filters shared by `/api/patients` and `/api/doctors/:id/patients`. */
const listFields = {
  ...paginationFields,
  search: searchField,
  condition: optionalQuery(z.enum(CONDITIONS)),
  status: optionalQuery(z.enum(PATIENT_STATUSES)),
  gender: optionalQuery(z.enum(GENDERS)),
  admittedFrom: optionalQuery(dateOnlySchema),
  admittedTo: optionalQuery(dateOnlySchema),
  sort: optionalQuery(z.enum(PATIENT_SORTS)).transform((sort) => sort ?? '-admissionDate'),
};

const admittedRangeIsOrdered = (q: { admittedFrom?: string; admittedTo?: string }) =>
  rangeIsOrdered(q.admittedFrom, q.admittedTo);
const admittedRangeError = { path: ['admittedTo'], message: 'End date must be on or after the start date' };

export const listPatientsQuerySchema = z
  .object({ ...listFields, doctorId: optionalQuery(objectIdSchema) })
  .refine(admittedRangeIsOrdered, admittedRangeError);

/** Same filters, minus `doctorId` (it comes from the path; a query value is ignored). */
export const listDoctorPatientsQuerySchema = z.object(listFields).refine(admittedRangeIsOrdered, admittedRangeError);

export type CreatePatientInput = z.output<typeof createPatientSchema>;
export type CreateDoctorPatientInput = z.output<typeof createDoctorPatientSchema>;
export type UpdatePatientInput = z.output<typeof updatePatientSchema>;
export type ListPatientsQuery = z.output<typeof listPatientsQuerySchema>;
export type ListDoctorPatientsQuery = z.output<typeof listDoctorPatientsQuerySchema>;
export type PatientSort = (typeof PATIENT_SORTS)[number];
