/**
 * Demo data: npm run seed
 *
 * Upserts the admin from .env, then REPLACES every doctor and patient in MONGODB_URI with a
 * realistic data set. The faker seed is fixed, so every run creates the same people; dates are
 * relative to today, so the dashboard's 30d / 90d / 12m views always have data.
 * Refresh tokens (sessions) are left alone. Refuses to run with NODE_ENV=production unless --force.
 *
 * To copy the result to the shared database afterwards: npm run db:sync -- --yes
 */
import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import { env, isProd } from '../config/env.js';
import {
  CONDITIONS,
  SPECIALIZATIONS,
  type Condition,
  type DoctorStatus,
  type Gender,
  type PatientStatus,
  type Specialization,
} from '../constants/enums.js';
import { seedAdmin } from '../modules/auth/auth.seed.js';
import { UserModel } from '../modules/auth/user.model.js';
import { DoctorModel } from '../modules/doctors/doctor.model.js';
import { PatientModel } from '../modules/patients/patient.model.js';

const SEED = 20261114;
const DOCTOR_COUNT = 15; // at least one per specialization (10)
const PATIENT_COUNT = 200;

const HOSPITALS = [
  'St. Mary Medical Center',
  'Riverside General Hospital',
  'Northgate Clinic',
  'Lakeview Hospital',
  'Cedar Grove Medical',
  'Harborview Health',
  'Summit Care Hospital',
  'Westbrook Medical Center',
];

/** Conditions a specialist mostly sees (picked 70% of the time; otherwise any condition). */
const TYPICAL_CONDITIONS: Record<Specialization, Condition[]> = {
  Cardiology: ['Hypertension', 'Heart Disease'],
  Dermatology: ['Skin Condition'],
  Endocrinology: ['Diabetes'],
  Gastroenterology: ['Other'],
  'General Medicine': ['Respiratory Infection', 'Hypertension', 'Diabetes'],
  Neurology: ['Migraine'],
  Oncology: ['Other'],
  Orthopedics: ['Fracture', 'Arthritis'],
  Pediatrics: ['Asthma', 'Respiratory Infection'],
  Psychiatry: ['Anxiety'],
};

/** How likely each specialization is for the doctors beyond the first one of each: common ones more often. */
const EXTRA_SPECIALIZATION_WEIGHTS: Record<Specialization, number> = {
  'General Medicine': 5,
  Cardiology: 3,
  Pediatrics: 3,
  Orthopedics: 2,
  Neurology: 2,
  Dermatology: 1,
  Endocrinology: 1,
  Psychiatry: 1,
  Gastroenterology: 0.5,
  Oncology: 0.5,
};

/** Admissions per calendar month (Jan → Dec): a winter bump. */
const MONTH_WEIGHTS = [1.5, 1.4, 1.1, 0.9, 0.8, 0.7, 0.7, 0.8, 0.9, 1.0, 1.2, 1.5];

const NOTES = [
  'Follow-up in two weeks',
  'Responding well to treatment',
  'Review medication dosage',
  'Referred for imaging',
  'Allergic to penicillin',
  'Requires dietary consultation',
  'Monitor blood pressure weekly',
  'Physiotherapy twice a week',
];

const DAY_MS = 86_400_000;

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const phone = () => `+1 555 ${faker.string.numeric(3)} ${faker.string.numeric(4)}`;
const utcMidnight = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

function buildDoctors(now: Date) {
  // Every specialization at least once, then weighted extras, in random order.
  const extraChoices = SPECIALIZATIONS.map((value) => ({ weight: EXTRA_SPECIALIZATION_WEIGHTS[value], value }));
  const specializations = faker.helpers.shuffle([
    ...SPECIALIZATIONS,
    ...faker.helpers.multiple(() => faker.helpers.weightedArrayElement(extraChoices), { count: DOCTOR_COUNT - SPECIALIZATIONS.length }),
  ]);
  const onLeave = Math.round(DOCTOR_COUNT * 0.2);
  const statuses = faker.helpers.shuffle<DoctorStatus>([
    'inactive',
    ...Array<DoctorStatus>(onLeave).fill('on_leave'),
    ...Array<DoctorStatus>(DOCTOR_COUNT - onLeave - 1).fill('active'),
  ]);
  const emails = new Set<string>();

  return specializations.map((specialization, i) => {
    const first = faker.person.firstName();
    const last = faker.person.lastName();
    const hospital = faker.helpers.arrayElement(HOSPITALS);

    let email = `${slug(first)}.${slug(last)}@${slug(hospital)}.example.org`;
    if (emails.has(email)) email = email.replace('@', `${i}@`);
    emails.add(email);

    return {
      name: `Dr. ${first} ${last}`,
      specialization,
      hospital,
      phone: phone(),
      email,
      status: statuses[i]!,
      yearsOfExperience: faker.number.int({ min: 2, max: 35 }),
      // Joined 1–6 years ago, so every doctor predates the 12-month patient window.
      joinedAt: utcMidnight(faker.date.between({ from: now.getTime() - 6 * 365 * DAY_MS, to: now.getTime() - 365 * DAY_MS })),
    };
  });
}

/** The 12 calendar months the dashboard's 12m view covers, weighted by season (the current month by how much has passed). */
function admissionMonths(now: Date) {
  return Array.from({ length: 12 }, (_, i) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
    const nextMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const end = i === 11 ? now : new Date(nextMonth.getTime() - 1);
    const elapsed = (end.getTime() - start.getTime()) / (nextMonth.getTime() - start.getTime());
    return { weight: MONTH_WEIGHTS[start.getUTCMonth()]! * elapsed, value: { start, end } };
  });
}

function patientStatus(admissionDate: Date, now: Date): PatientStatus {
  const days = (now.getTime() - admissionDate.getTime()) / DAY_MS;
  // Older admissions are more likely to have recovered.
  const [active, treatment, recovered] = days < 30 ? [5, 4, 1] : days < 120 ? [3, 3, 4] : [1.5, 1.5, 7];
  return faker.helpers.weightedArrayElement<PatientStatus>([
    { weight: active, value: 'active' },
    { weight: treatment, value: 'under_treatment' },
    { weight: recovered, value: 'recovered' },
  ]);
}

function buildPatients(doctors: Array<{ _id: mongoose.Types.ObjectId; specialization: Specialization; status: DoctorStatus }>, now: Date) {
  // Uneven workloads: a few busy doctors, inactive ones with only a handful of patients.
  const doctorChoices = doctors.map((doctor) => ({
    weight:
      doctor.status === 'inactive'
        ? 0.3
        : faker.helpers.weightedArrayElement([
            { weight: 2, value: 0.6 },
            { weight: 5, value: 1 },
            { weight: 2, value: 2.4 },
          ]),
    value: doctor,
  }));
  const months = admissionMonths(now);

  return Array.from({ length: PATIENT_COUNT }, () => {
    const doctor = faker.helpers.weightedArrayElement(doctorChoices);
    const { start, end } = faker.helpers.weightedArrayElement(months);
    const admissionDate = utcMidnight(faker.date.between({ from: start, to: end }));

    const gender = faker.helpers.weightedArrayElement<Gender>([
      { weight: 48, value: 'female' },
      { weight: 48, value: 'male' },
      { weight: 4, value: 'other' },
    ]);
    const first = faker.person.firstName(gender === 'other' ? undefined : gender);
    const last = faker.person.lastName();

    const condition = faker.datatype.boolean({ probability: 0.7 })
      ? faker.helpers.arrayElement(TYPICAL_CONDITIONS[doctor.specialization])
      : faker.helpers.arrayElement(CONDITIONS);

    return {
      name: `${first} ${last}`,
      age: doctor.specialization === 'Pediatrics' ? faker.number.int({ min: 1, max: 17 }) : faker.number.int({ min: 18, max: 90 }),
      gender,
      phone: phone(),
      email: faker.datatype.boolean({ probability: 0.7 })
        ? `${slug(first)}.${slug(last)}${faker.number.int({ min: 1, max: 99 })}@${faker.helpers.arrayElement(['example.com', 'example.net'])}`
        : undefined,
      condition,
      status: patientStatus(admissionDate, now),
      admissionDate,
      notes: faker.datatype.boolean({ probability: 0.4 }) ? faker.helpers.arrayElement(NOTES) : undefined,
      doctorId: doctor._id,
    };
  });
}

// ─── Run ─────────────────────────────────────────────────────────────────────────────────

if (isProd && !process.argv.includes('--force')) {
  console.error('Refusing to seed with NODE_ENV=production (it replaces all doctors and patients). Add --force to override.');
  process.exit(1);
}
if (!env.ADMIN_PASSWORD) {
  console.error('Set ADMIN_PASSWORD in backend/.env before seeding.');
  process.exit(1);
}

await connectDb();
const target = `${mongoose.connection.host}/${mongoose.connection.name}`;

try {
  faker.seed(SEED);
  const now = new Date();

  await Promise.all([UserModel.syncIndexes(), DoctorModel.syncIndexes(), PatientModel.syncIndexes()]);
  const admin = await seedAdmin({ name: env.ADMIN_NAME, email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });

  await Promise.all([PatientModel.deleteMany({}), DoctorModel.deleteMany({})]);
  // insertMany runs schema validation and the searchKey hook for every document.
  const doctors = await DoctorModel.insertMany(buildDoctors(now));
  const patients = await PatientModel.insertMany(buildPatients(doctors, now));

  const admissions = patients.map((p) => p.admissionDate.getTime());
  const last30 = admissions.filter((t) => t >= now.getTime() - 30 * DAY_MS).length;

  console.log(`Seeded ${target}`);
  console.log(`  admin     ${admin.email}`);
  console.log(`  doctors   ${doctors.length} (${doctors.filter((d) => d.status === 'active').length} active)`);
  console.log(`  patients  ${patients.length}, admitted ${new Date(Math.min(...admissions)).toISOString().slice(0, 10)} → ${new Date(Math.max(...admissions)).toISOString().slice(0, 10)} (${last30} in the last 30 days)`);
} finally {
  await disconnectDb();
}
