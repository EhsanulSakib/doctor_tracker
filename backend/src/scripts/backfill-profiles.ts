/**
 * Fill in profile details for existing doctors: npm run backfill
 *
 * Non-destructive, unlike `npm run seed`: no doctor or patient is replaced. Only the seeded demo doctors
 * are touched (recognised by their seed email domains); doctors added in the app are left alone. For each it
 *  - renames the fictional hospital names older data sets used to the real hospital (HOSPITALS),
 *  - adds degrees, BMDC registration, fee, chamber room / days / hours and a bio where they are missing
 *    (anything already filled in is kept),
 *  - adds 18 weeks of attendance history if the doctor has none yet.
 * Values are generated per doctor from its id, so running it twice gives the same result.
 */
import { en, Faker } from '@faker-js/faker';
import { connectDb, disconnectDb } from '../config/db.js';
import { todayAsDateOnly } from '../lib/dates.js';
import { AttendanceModel } from '../modules/attendance/attendance.model.js';
import { DoctorModel } from '../modules/doctors/doctor.model.js';
import { buildAttendance, HOSPITALS, profileDetails } from './seed-profiles.js';

const renamed = new Map(HOSPITALS.map((h) => [h.legacy, h.name]));
const seedDomains = new Set(HOSPITALS.map((h) => h.domain));
/** A stable number from a doctor id, to seed that doctor's generator. */
const seedOf = (id: string) => [...id].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 2_147_483_647, 7);

await connectDb();
try {
  const today = todayAsDateOnly();
  const doctors = (await DoctorModel.find({})).filter((d) => seedDomains.has(d.email.split('@')[1] ?? ''));
  let profiles = 0;
  let hospitals = 0;
  let attendanceDays = 0;

  for (const doctor of doctors) {
    const f = new Faker({ locale: [en] });
    f.seed(seedOf(doctor._id.toString()));

    const realHospital = renamed.get(doctor.hospital);
    if (realHospital) {
      doctor.hospital = realHospital;
      hospitals += 1;
    }

    const details = profileDetails(f, doctor.specialization, doctor.hospital, doctor.yearsOfExperience);
    let changed = false;
    const fill = <K extends keyof typeof details>(key: K, missing: boolean) => {
      if (!missing) return;
      doctor.set(key, details[key]);
      changed = true;
    };
    fill('degrees', !doctor.degrees?.length);
    if (changed) doctor.set('qualifications', details.qualifications);
    fill('registrationNo', !doctor.registrationNo);
    fill('consultationFee', doctor.consultationFee == null);
    fill('chamberRoom', !doctor.chamberRoom);
    fill('chamberDays', !doctor.chamberDays?.length);
    // Start and end belong together: both are filled when either is missing.
    const hoursMissing = !doctor.chamberStart || !doctor.chamberEnd;
    fill('chamberStart', hoursMissing);
    fill('chamberEnd', hoursMissing);
    fill('bio', !doctor.bio);
    if (changed) profiles += 1;

    await doctor.save();

    if (!(await AttendanceModel.exists({ doctorId: doctor._id }))) {
      const records = buildAttendance(f, [{ _id: doctor._id, status: doctor.status, chamberDays: doctor.chamberDays }], today);
      if (records.length) await AttendanceModel.insertMany(records);
      attendanceDays += records.length;
    }
  }

  console.log(`Backfilled ${doctors.length} doctors: ${profiles} profiles completed, ${hospitals} hospitals renamed, ${attendanceDays} attendance days added.`);
} finally {
  await disconnectDb();
}
