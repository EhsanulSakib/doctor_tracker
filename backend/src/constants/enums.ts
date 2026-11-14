// Fixed value lists shared by models, validation and seed data.
// The frontend mirrors these in its own constants file.

export const SPECIALIZATIONS = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'Gastroenterology',
  'General Medicine',
  'Neurology',
  'Oncology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
] as const;

export const DOCTOR_STATUSES = ['active', 'on_leave', 'inactive'] as const;

export const CONDITIONS = [
  'Hypertension',
  'Diabetes',
  'Asthma',
  'Arthritis',
  'Migraine',
  'Heart Disease',
  'Respiratory Infection',
  'Fracture',
  'Skin Condition',
  'Anxiety',
  'Other',
] as const;

export const PATIENT_STATUSES = ['active', 'under_treatment', 'recovered'] as const;

export const GENDERS = ['male', 'female', 'other'] as const;

export type Specialization = (typeof SPECIALIZATIONS)[number];
export type DoctorStatus = (typeof DOCTOR_STATUSES)[number];
export type Condition = (typeof CONDITIONS)[number];
export type PatientStatus = (typeof PATIENT_STATUSES)[number];
export type Gender = (typeof GENDERS)[number];
