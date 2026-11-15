// Doctor profile details and attendance history, shared by `npm run seed` (new data) and
// `npm run backfill` (fills the gaps in existing doctors without replacing anyone).
import type { Faker } from '@faker-js/faker';
import type { Types } from 'mongoose';
import { WEEKDAYS, type AttendanceStatus, type DoctorStatus, type Specialization, type Weekday } from '../constants/enums.js';
import { weekdayOf } from '../lib/dates.js';

const DAY_MS = 86_400_000;

/** Days of attendance history: 18 weeks, what the profile's attendance calendar shows. */
export const ATTENDANCE_DAYS = 126;

/**
 * Government medical college hospitals and specialised institutes in Bangladesh. Doctor emails keep
 * reserved example.org domains (no real inboxes). `legacy` is the fictional name older data sets used.
 */
export const HOSPITALS = [
  { name: 'Dhaka Medical College Hospital', domain: 'lakeview-dhaka.example.org', legacy: 'Dhanmondi Lakeview Hospital' },
  { name: 'Shaheed Suhrawardy Medical College Hospital', domain: 'crescent-gulshan.example.org', legacy: 'Gulshan Crescent Medical Centre' },
  { name: 'Kurmitola General Hospital', domain: 'northpoint-uttara.example.org', legacy: 'Uttara Northpoint Hospital' },
  { name: 'Sir Salimullah Medical College Mitford Hospital', domain: 'shapla-mirpur.example.org', legacy: 'Mirpur Shapla Clinic' },
  { name: 'Chattogram Medical College Hospital', domain: 'bayview-ctg.example.org', legacy: 'Chattogram Bayview Hospital' },
  { name: 'Sylhet MAG Osmani Medical College Hospital', domain: 'teavalley-sylhet.example.org', legacy: 'Sylhet Tea Valley Medical' },
  { name: 'Rajshahi Medical College Hospital', domain: 'padmacare-rajshahi.example.org', legacy: 'Rajshahi Padma Care Centre' },
  { name: 'Khulna Medical College Hospital', domain: 'rupsha-khulna.example.org', legacy: 'Khulna Rupsha General Hospital' },
];

/** Where Bangladeshi doctors earn their MBBS. */
const MEDICAL_COLLEGES = [
  'Dhaka Medical College',
  'Sir Salimullah Medical College, Dhaka',
  'Shaheed Suhrawardy Medical College, Dhaka',
  'Chattogram Medical College',
  'Rajshahi Medical College',
  'Mymensingh Medical College',
  'Sylhet MAG Osmani Medical College',
  'Sher-e-Bangla Medical College, Barishal',
  'Rangpur Medical College',
  'Khulna Medical College',
];

const BCPS = 'Bangladesh College of Physicians and Surgeons (BCPS)';

/** Postgraduate paths per specialty: one is picked, its degrees earned in this order after the MBBS. */
const POSTGRADUATE: Record<Specialization, Array<Array<[title: string, institute: string]>>> = {
  Cardiology: [
    [['FCPS (Medicine)', BCPS], ['MD (Cardiology)', 'National Institute of Cardiovascular Diseases (NICVD), Dhaka']],
    [['MD (Cardiology)', 'National Institute of Cardiovascular Diseases (NICVD), Dhaka']],
  ],
  Dermatology: [
    [['DDV', 'Sir Salimullah Medical College, Dhaka'], ['FCPS (Dermatology & Venereology)', BCPS]],
    [['DDV', 'Dhaka Medical College']],
  ],
  Endocrinology: [[['MD (Endocrinology & Metabolism)', 'BIRDEM Academy, Dhaka']], [['FCPS (Medicine)', BCPS], ['MD (Endocrinology & Metabolism)', 'BIRDEM Academy, Dhaka']]],
  Gastroenterology: [
    [['FCPS (Medicine)', BCPS], ['MD (Gastroenterology)', 'Dhaka Medical College']],
    [['MD (Hepatology)', 'Sheikh Russel National Gastroliver Institute & Hospital, Dhaka']],
  ],
  'General Medicine': [[['FCPS (Medicine)', BCPS]], [['MD (Internal Medicine)', 'Dhaka Medical College'], ['MRCP (UK)', 'Royal College of Physicians, United Kingdom']]],
  Neurology: [[['MD (Neurology)', 'National Institute of Neurosciences & Hospital (NINS), Dhaka']], [['FCPS (Medicine)', BCPS], ['MD (Neurology)', 'National Institute of Neurosciences & Hospital (NINS), Dhaka']]],
  Oncology: [[['FCPS (Radiotherapy)', BCPS]], [['MD (Clinical Oncology)', 'National Institute of Cancer Research & Hospital (NICRH), Dhaka']]],
  Orthopedics: [
    [['D-Ortho', 'National Institute of Traumatology and Orthopaedic Rehabilitation (NITOR), Dhaka'], ['MS (Orthopaedics)', 'National Institute of Traumatology and Orthopaedic Rehabilitation (NITOR), Dhaka']],
    [['FCPS (Surgery)', BCPS], ['MS (Orthopaedics)', 'National Institute of Traumatology and Orthopaedic Rehabilitation (NITOR), Dhaka']],
  ],
  Pediatrics: [[['DCH', 'Bangladesh Institute of Child Health (BICH), Dhaka'], ['FCPS (Paediatrics)', BCPS]], [['MD (Paediatrics)', 'Dhaka Medical College']]],
  Psychiatry: [[['FCPS (Psychiatry)', BCPS]], [['MD (Psychiatry)', 'National Institute of Mental Health (NIMH), Dhaka']]],
};

const CHAMBER_SLOTS = [
  { start: '09:00', end: '13:00' },
  { start: '10:00', end: '14:00' },
  { start: '15:00', end: '18:00' },
  { start: '17:00', end: '21:00' },
  { start: '18:00', end: '22:00' },
];

const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

export type Degree = { title: string; institute: string; year: number };

/** MBBS (graduation year from the years of experience), then a postgraduate path for the specialty. */
export function buildDegrees(f: Faker, specialization: Specialization, yearsOfExperience: number, currentYear = new Date().getFullYear()): Degree[] {
  const mbbsYear = currentYear - yearsOfExperience - 1; // a year of internship before practice counts
  const degrees: Degree[] = [{ title: 'MBBS', institute: f.helpers.arrayElement(MEDICAL_COLLEGES), year: mbbsYear }];
  let year = mbbsYear;
  for (const [title, institute] of f.helpers.arrayElement(POSTGRADUATE[specialization])) {
    year = Math.min(currentYear, year + f.number.int({ min: 3, max: 6 }));
    // A junior doctor may not have reached the later degrees yet.
    if (year > currentYear - 1 && degrees.length > 1) break;
    degrees.push({ title, institute, year });
  }
  return degrees;
}

/** Degrees, BMDC registration, fee, chamber room and hours, and a one-line bio. Friday is the weekly holiday. */
export function profileDetails(f: Faker, specialization: Specialization, hospital: string, yearsOfExperience: number) {
  const workdays: Weekday[] = WEEKDAYS.filter((d) => d !== 'fri');
  const picked = f.helpers.arrayElements(workdays, f.number.int({ min: 4, max: 6 }));
  const slot = f.helpers.arrayElement(CHAMBER_SLOTS);
  const floor = f.number.int({ min: 1, max: 6 });
  const fee = yearsOfExperience >= 20 ? [1200, 1500] : yearsOfExperience >= 10 ? [800, 1000] : [500, 600, 700];
  const degrees = buildDegrees(f, specialization, yearsOfExperience);

  return {
    degrees,
    qualifications: degrees.map((d) => d.title).join(', '),
    registrationNo: `A-${f.string.numeric(5)}`,
    consultationFee: f.helpers.arrayElement(fee),
    chamberRoom: `Room ${floor}${f.string.numeric(2)}, ${ordinal(floor)} floor`,
    chamberDays: WEEKDAYS.filter((d) => picked.includes(d)),
    chamberStart: slot.start,
    chamberEnd: slot.end,
    bio: `${specialization} consultant with ${yearsOfExperience} years of practice, seeing patients at ${hospital}.`,
  };
}

/**
 * The last 18 weeks (today included), on chamber days only, for every doctor. Active doctors are nearly
 * always present; doctors on leave have been away for the last few days; inactive doctors worked as
 * usual until they stopped a few weeks ago and are marked away since. Today is marked for about two
 * thirds of the doctors due in, like a morning register.
 */
export function buildAttendance(f: Faker, doctors: Array<{ _id: Types.ObjectId; status: DoctorStatus; chamberDays: Weekday[] }>, today: Date) {
  const records: Array<{ doctorId: Types.ObjectId; date: Date; status: AttendanceStatus }> = [];

  for (const doctor of doctors) {
    const leaveDays =
      doctor.status === 'on_leave' ? f.number.int({ min: 3, max: 12 }) : doctor.status === 'inactive' ? f.number.int({ min: 14, max: 45 }) : -1;

    for (let ago = ATTENDANCE_DAYS - 1; ago >= 0; ago -= 1) {
      const date = new Date(today.getTime() - ago * DAY_MS);
      if (!doctor.chamberDays.includes(weekdayOf(date.toISOString().slice(0, 10)))) continue;

      let status: AttendanceStatus | null;
      if (ago <= leaveDays) status = 'leave';
      else if (ago === 0) status = f.datatype.boolean({ probability: 0.65 }) ? 'present' : null;
      else
        status = f.helpers.weightedArrayElement<AttendanceStatus>([
          { weight: 90, value: 'present' },
          { weight: 7, value: 'absent' },
          { weight: 3, value: 'leave' },
        ]);

      if (status) records.push({ doctorId: doctor._id, date, status });
    }
  }
  return records;
}
