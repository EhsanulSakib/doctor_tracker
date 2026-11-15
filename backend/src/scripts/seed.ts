/**
 * Demo data: npm run seed
 *
 * Upserts the admin from .env, then REPLACES every doctor and patient in MONGODB_URI with a
 * realistic Bangladeshi data set: local names, hospitals in Dhaka and other divisions, +880 mobile
 * numbers, monsoon and winter admission peaks. The faker seed is fixed, so every run creates the
 * same people; dates are relative to today in APP_TIMEZONE (Asia/Dhaka), so the dashboard's
 * 30d / 90d / 12m views always have data.
 * Notifications (the topbar bell) are rebuilt from those people: about 30 over the last 7 days,
 * the newest 12 unread.
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
import { todayAsDateOnly } from '../lib/dates.js';
import { seedAdmin } from '../modules/auth/auth.seed.js';
import { UserModel } from '../modules/auth/user.model.js';
import { DoctorModel } from '../modules/doctors/doctor.model.js';
import { NotificationModel } from '../modules/notifications/notification.model.js';
import { notificationCopy, type NotificationInput } from '../modules/notifications/notifications.service.js';
import { PatientModel } from '../modules/patients/patient.model.js';

const SEED = 20261114;
const DOCTOR_COUNT = 15; // at least one per specialization (10)
const PATIENT_COUNT = 200;
const NOTIFICATION_COUNT = 30;
const UNREAD_NOTIFICATIONS = 12; // more than 9, so the bell shows "9+"
const MAX_RECOVERIES = 8;

/** Fictional hospitals across Bangladesh (most in Dhaka). Emails use reserved example.org domains. */
const HOSPITALS = [
  { name: 'Dhanmondi Lakeview Hospital', domain: 'lakeview-dhaka.example.org' },
  { name: 'Gulshan Crescent Medical Centre', domain: 'crescent-gulshan.example.org' },
  { name: 'Uttara Northpoint Hospital', domain: 'northpoint-uttara.example.org' },
  { name: 'Mirpur Shapla Clinic', domain: 'shapla-mirpur.example.org' },
  { name: 'Chattogram Bayview Hospital', domain: 'bayview-ctg.example.org' },
  { name: 'Sylhet Tea Valley Medical', domain: 'teavalley-sylhet.example.org' },
  { name: 'Rajshahi Padma Care Centre', domain: 'padmacare-rajshahi.example.org' },
  { name: 'Khulna Rupsha General Hospital', domain: 'rupsha-khulna.example.org' },
];

/** Bangladeshi names, romanized as they appear on English-language records. */
const NAMES = {
  muslim: {
    male: ['Tanvir', 'Arif', 'Fahim', 'Imran', 'Sabbir', 'Mahmudul', 'Rafiqul', 'Shakil', 'Nazmul', 'Jahid', 'Rakibul', 'Sajid', 'Tareq', 'Ashraful', 'Habibur', 'Mizanur', 'Kamrul', 'Mehedi', 'Rasel', 'Zahid', 'Farhan', 'Tahmid', 'Nafis', 'Ishtiaque', 'Mostafizur', 'Saiful', 'Anisul', 'Rezaul'],
    female: ['Nusrat', 'Farzana', 'Sadia', 'Tasnim', 'Sumaiya', 'Afsana', 'Nasrin', 'Shirin', 'Roksana', 'Fatema', 'Ayesha', 'Mahmuda', 'Sharmin', 'Jannatul', 'Tahmina', 'Rumana', 'Shabnam', 'Lamia', 'Nabila', 'Anika', 'Maliha', 'Sanjida', 'Rehana', 'Dilruba', 'Mithila', 'Shamima'],
    surname: ['Ahmed', 'Hossain', 'Rahman', 'Islam', 'Chowdhury', 'Khan', 'Uddin', 'Sarkar', 'Talukder', 'Siddique', 'Haque', 'Kabir', 'Alam', 'Karim', 'Bhuiyan', 'Mollah', 'Sheikh', 'Majumder', 'Miah', 'Hasan'],
    femaleSurname: ['Akter', 'Begum', 'Khatun', 'Sultana'],
  },
  hindu: {
    male: ['Sourav', 'Pritom', 'Arnab', 'Dipankar', 'Subrata', 'Anik', 'Joydeep', 'Partha', 'Shuvo', 'Tapas'],
    female: ['Puja', 'Moumita', 'Ananya', 'Rupa', 'Priyanka', 'Sharmistha', 'Tanushree', 'Mousumi', 'Dipa', 'Shreya'],
    surname: ['Das', 'Roy', 'Saha', 'Paul', 'Chakraborty', 'Ghosh', 'Dey', 'Sen', 'Biswas', 'Mondal'],
    femaleSurname: [] as string[],
  },
};

type PersonName = { first: string; last: string; sex: 'male' | 'female' };

function bangladeshiName(gender?: Gender): PersonName {
  const community = faker.helpers.weightedArrayElement([
    { weight: 88, value: NAMES.muslim },
    { weight: 12, value: NAMES.hindu },
  ]);
  const sex = gender === 'male' || gender === 'female' ? gender : faker.helpers.arrayElement(['male', 'female'] as const);
  const surnames =
    sex === 'female' && community.femaleSurname.length && faker.datatype.boolean({ probability: 0.4 })
      ? community.femaleSurname
      : community.surname;
  return { first: faker.helpers.arrayElement(community[sex]), last: faker.helpers.arrayElement(surnames), sex };
}

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

/** Admissions per calendar month (Jan → Dec): Bangladesh's monsoon peak (Jul–Sep, dengue season) and a winter rise. */
const MONTH_WEIGHTS = [1.2, 1.0, 0.9, 0.8, 0.9, 1.1, 1.4, 1.5, 1.4, 1.2, 1.0, 1.1];

const NOTES = [
  'Follow-up in two weeks',
  'Responding well to treatment',
  'Review medication dosage',
  'Referred for imaging',
  'Allergic to penicillin',
  'Advised ORS and plenty of fluids',
  'Check fasting blood sugar at next visit',
  'Monitor blood pressure weekly',
  'Physiotherapy twice a week',
  'Platelet count to be repeated in 48 hours',
];

const DAY_MS = 86_400_000;

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
/** Bangladeshi mobile number, e.g. +880 1712-345678 (operator prefixes 013–019). */
const phone = () => `+880 1${faker.number.int({ min: 3, max: 9 })}${faker.string.numeric(2)}-${faker.string.numeric(6)}`;
const utcMidnight = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

function buildDoctors(today: Date) {
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
    const { first, last } = bangladeshiName();
    // Most doctors work in Dhaka.
    const hospital = faker.helpers.weightedArrayElement(HOSPITALS.map((h, idx) => ({ weight: idx < 4 ? 2 : 1, value: h })));

    let email = `${slug(first)}.${slug(last)}@${hospital.domain}`;
    if (emails.has(email)) email = email.replace('@', `${i}@`);
    emails.add(email);

    return {
      name: `Dr. ${first} ${last}`,
      specialization,
      hospital: hospital.name,
      phone: phone(),
      email,
      status: statuses[i]!,
      yearsOfExperience: faker.number.int({ min: 2, max: 35 }),
      // Joined 1–6 years ago, so every doctor predates the 12-month patient window.
      joinedAt: utcMidnight(faker.date.between({ from: today.getTime() - 6 * 365 * DAY_MS, to: today.getTime() - 365 * DAY_MS })),
    };
  });
}

/** The 12 calendar months the dashboard's 12m view covers, weighted by season (the current month by how much has passed). */
function admissionMonths(today: Date) {
  return Array.from({ length: 12 }, (_, i) => {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11 + i, 1));
    const nextMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const end = i === 11 ? today : new Date(nextMonth.getTime() - DAY_MS);
    const elapsed = (end.getTime() + DAY_MS - start.getTime()) / (nextMonth.getTime() - start.getTime());
    return { weight: MONTH_WEIGHTS[start.getUTCMonth()]! * elapsed, value: { start, end } };
  });
}

function patientStatus(admissionDate: Date, today: Date): PatientStatus {
  const days = (today.getTime() - admissionDate.getTime()) / DAY_MS;
  // Older admissions are more likely to have recovered.
  const [active, treatment, recovered] = days < 30 ? [5, 4, 1] : days < 120 ? [3, 3, 4] : [1.5, 1.5, 7];
  return faker.helpers.weightedArrayElement<PatientStatus>([
    { weight: active, value: 'active' },
    { weight: treatment, value: 'under_treatment' },
    { weight: recovered, value: 'recovered' },
  ]);
}

function buildPatients(doctors: Array<{ _id: mongoose.Types.ObjectId; specialization: Specialization; status: DoctorStatus }>, today: Date) {
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
  const months = admissionMonths(today);

  return Array.from({ length: PATIENT_COUNT }, () => {
    const doctor = faker.helpers.weightedArrayElement(doctorChoices);
    const { start, end } = faker.helpers.weightedArrayElement(months);
    // Calendar dates only (UTC midnight), never after today in Dhaka.
    const admissionDate = utcMidnight(faker.date.between({ from: start, to: end }));

    const pediatric = doctor.specialization === 'Pediatrics';
    const gender = faker.helpers.weightedArrayElement<Gender>([
      { weight: 49, value: 'female' },
      { weight: 49, value: 'male' },
      ...(pediatric ? [] : [{ weight: 2, value: 'other' as const }]), // adults only
    ]);
    const { first, last } = bangladeshiName(gender);

    const condition = faker.datatype.boolean({ probability: 0.7 })
      ? faker.helpers.arrayElement(TYPICAL_CONDITIONS[doctor.specialization])
      : faker.helpers.arrayElement(CONDITIONS);

    return {
      name: `${first} ${last}`,
      age: pediatric ? faker.number.int({ min: 1, max: 17 }) : faker.number.int({ min: 18, max: 85 }),
      gender,
      phone: phone(),
      email: faker.datatype.boolean({ probability: 0.6 })
        ? `${slug(first)}.${slug(last)}${faker.number.int({ min: 1, max: 99 })}@${faker.helpers.arrayElement(['example.com', 'example.net'])}`
        : undefined,
      condition,
      status: patientStatus(admissionDate, today),
      admissionDate,
      notes: faker.datatype.boolean({ probability: 0.4 }) ? faker.helpers.arrayElement(NOTES) : undefined,
      doctorId: doctor._id,
    };
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────────────────

type SeedDoctor = {
  _id: mongoose.Types.ObjectId;
  name: string;
  specialization: Specialization;
  hospital: string;
  status: DoctorStatus;
};
type SeedPatient = { _id: mongoose.Types.ObjectId; name: string; status: PatientStatus; admissionDate: Date; doctorId: mongoose.Types.ObjectId };

/** APP_TIMEZONE's UTC offset in minutes at a given moment (Asia/Dhaka: +360 all year). */
function zoneOffsetMinutes(at: Date): number {
  const label =
    new Intl.DateTimeFormat('en-US', { timeZone: env.APP_TIMEZONE, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = /GMT([+-])(\d{2}):?(\d{2})?/.exec(label);
  return match ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3] ?? 0)) : 0;
}

// Clinic hours, in local minutes after midnight.
const OPENING = 10 * 60;
const CLOSING = 18 * 60 + 59;

/**
 * A moment between `from` and `to` (local time) on a calendar date (UTC midnight), never after
 * `now`: today only up to the current minute.
 */
function clinicHoursOn(date: Date, now: Date, from = OPENING, to = CLOSING): Date {
  const localMidnight = date.getTime() - zoneOffsetMinutes(date) * 60_000;
  const start = localMidnight + from * 60_000;
  const end = Math.min(localMidnight + to * 60_000, now.getTime() - 60_000);
  // Today, before opening time: a moment shortly before now instead.
  if (end <= start) return new Date(now.getTime() - faker.number.int({ min: 5, max: 60 }) * 60_000);
  return new Date(faker.number.int({ min: start, max: end }));
}

/** One of the last 7 calendar days (today included), not before `from`. */
function recentDay(today: Date, from?: Date): Date {
  const maxBack = from ? Math.min(6, Math.max(0, Math.floor((today.getTime() - from.getTime()) / DAY_MS))) : 6;
  return new Date(today.getTime() - faker.number.int({ min: 0, max: maxBack }) * DAY_MS);
}

function buildNotifications(doctors: SeedDoctor[], patients: SeedPatient[], today: Date, now: Date) {
  const doctorById = new Map(doctors.map((d) => [d._id.toString(), d]));
  const doctorOf = (patient: SeedPatient) => doctorById.get(patient.doctorId.toString())!;
  const ref = (patient: SeedPatient) => ({ id: patient._id, name: patient.name });
  const newestAdmissionFirst = (a: SeedPatient, b: SeedPatient) => b.admissionDate.getTime() - a.admissionDate.getTime();
  const events: Array<NotificationInput & { createdAt: Date }> = [];

  // This week's admissions, on the day they were admitted.
  const weekStart = new Date(today.getTime() - 6 * DAY_MS);
  for (const patient of patients.filter((p) => p.admissionDate >= weekStart).sort(newestAdmissionFirst).slice(0, 10)) {
    events.push({ ...notificationCopy.patientAdmitted(ref(patient), doctorOf(patient)), createdAt: clinicHoursOn(patient.admissionDate, now) });
  }

  // Every doctor who is on leave or inactive, with their real number of patients still under care.
  for (const doctor of doctors) {
    if (doctor.status === 'active') continue;
    const stillAssigned = patients.filter((p) => p.doctorId.equals(doctor._id) && p.status !== 'recovered').length;
    events.push({
      ...notificationCopy.doctorUnavailable({ id: doctor._id, name: doctor.name, status: doctor.status }, stillAssigned),
      createdAt: clinicHoursOn(recentDay(today), now),
    });
  }

  // Doctors added to the tracker at the start of the week, before opening time, so every later
  // event that mentions them comes after they were added.
  const added = faker.helpers.arrayElements(doctors.filter((d) => d.status === 'active'), 3);
  for (const doctor of added) {
    events.push({
      ...notificationCopy.doctorAdded({ id: doctor._id, name: doctor.name, specialization: doctor.specialization, hospital: doctor.hospital }),
      createdAt: clinicHoursOn(weekStart, now, 9 * 60, 9 * 60 + 45),
    });
  }

  // Patients still under care who moved to an active doctor, from a colleague in the same field when
  // there is one (never from a doctor who was only just added).
  const movable = patients.filter((p) => p.status !== 'recovered' && doctorOf(p).status === 'active');
  for (const patient of faker.helpers.arrayElements(movable, 7)) {
    const current = doctorOf(patient);
    const others = doctors.filter((d) => !d._id.equals(current._id) && !added.includes(d));
    const sameField = others.filter((d) => d.specialization === current.specialization);
    const previous = faker.helpers.arrayElement(sameField.length ? sameField : others);
    events.push({
      ...notificationCopy.patientReassigned(ref(patient), current, previous),
      createdAt: clinicHoursOn(recentDay(today, patient.admissionDate), now),
    });
  }

  // Recoveries fill the rest (capped, so the newest items stay a mix of every type): the recovered
  // patients admitted most recently.
  const recovered = patients.filter((p) => p.status === 'recovered').sort(newestAdmissionFirst);
  for (const patient of recovered.slice(0, Math.min(MAX_RECOVERIES, Math.max(0, NOTIFICATION_COUNT - events.length)))) {
    events.push({
      ...notificationCopy.patientRecovered(ref(patient), doctorOf(patient)),
      createdAt: clinicHoursOn(recentDay(today, patient.admissionDate), now),
    });
  }

  // Newest first: the newest ones are unread, older ones were read a little after they arrived.
  return events
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((event, i) => ({
      ...event,
      readAt:
        i < UNREAD_NOTIFICATIONS
          ? null
          : new Date(Math.min(now.getTime(), event.createdAt.getTime() + faker.number.int({ min: 10, max: 240 }) * 60_000)),
    }));
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
  const today = todayAsDateOnly(); // today's date in APP_TIMEZONE

  await Promise.all([UserModel.syncIndexes(), DoctorModel.syncIndexes(), PatientModel.syncIndexes(), NotificationModel.syncIndexes()]);
  const admin = await seedAdmin({ name: env.ADMIN_NAME, email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });

  await Promise.all([PatientModel.deleteMany({}), DoctorModel.deleteMany({}), NotificationModel.deleteMany({})]);
  // insertMany runs schema validation and the searchKey hook for every document.
  const doctors = await DoctorModel.insertMany(buildDoctors(today));
  const patients = await PatientModel.insertMany(buildPatients(doctors, today));
  // createdAt is set explicitly (Mongoose only fills it in when it is missing).
  const notifications = await NotificationModel.insertMany(buildNotifications(doctors, patients, today, new Date()));

  const admissions = patients.map((p) => p.admissionDate.getTime());
  const last30 = admissions.filter((t) => t > today.getTime() - 30 * DAY_MS).length;

  console.log(`Seeded ${target} (today in ${env.APP_TIMEZONE}: ${today.toISOString().slice(0, 10)})`);
  console.log(`  admin     ${admin.email}`);
  console.log(`  doctors   ${doctors.length} (${doctors.filter((d) => d.status === 'active').length} active)`);
  console.log(`  notifications ${notifications.length} (${notifications.filter((n) => !n.readAt).length} unread), ${notifications.at(-1)?.createdAt.toISOString()} → ${notifications[0]?.createdAt.toISOString()}`);
  console.log(`  patients  ${patients.length}, admitted ${new Date(Math.min(...admissions)).toISOString().slice(0, 10)} → ${new Date(Math.max(...admissions)).toISOString().slice(0, 10)} (${last30} in the last 30 days)`);
} finally {
  await disconnectDb();
}
