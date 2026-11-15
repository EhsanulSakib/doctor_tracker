import type { AttendanceStatus } from '../../constants/enums.js';
import { todayAsDateOnly, todayInAppTimezone } from '../../lib/dates.js';
import { HttpError } from '../../lib/http-error.js';
import { DoctorModel } from '../doctors/doctor.model.js';
import { AttendanceModel } from './attendance.model.js';

const DAY_MS = 86_400_000;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export type AttendanceRecord = { date: string; status: AttendanceStatus };

export type AttendanceHistory = {
  /** First and last calendar day of the window (inclusive), `YYYY-MM-DD`. */
  from: string;
  to: string;
  /** Only the days that were marked, newest first. */
  records: AttendanceRecord[];
  summary: Record<AttendanceStatus, number>;
};

async function assertDoctorExists(doctorId: string) {
  if (!(await DoctorModel.exists({ _id: doctorId }))) throw HttpError.notFound('Doctor');
}

/** The last `days` calendar days (today included) of one doctor's attendance. */
export async function listAttendance(doctorId: string, days: number): Promise<AttendanceHistory> {
  await assertDoctorExists(doctorId);

  const to = todayAsDateOnly();
  const from = new Date(to.getTime() - (days - 1) * DAY_MS);
  const rows = await AttendanceModel.find({ doctorId, date: { $gte: from, $lte: to } }, { date: 1, status: 1 })
    .sort({ date: -1 })
    .lean();

  const summary: Record<AttendanceStatus, number> = { present: 0, absent: 0, leave: 0 };
  for (const row of rows) summary[row.status] += 1;

  return {
    from: isoDay(from),
    to: isoDay(to),
    records: rows.map((row) => ({ date: isoDay(row.date), status: row.status })),
    summary,
  };
}

/**
 * Marks one day (today by default) as present / absent / leave, or clears it with `null`.
 * Future days can't be marked; a correction for a past day can.
 */
export async function setAttendance(doctorId: string, date: string | undefined, status: AttendanceStatus | null): Promise<AttendanceRecord | null> {
  await assertDoctorExists(doctorId);

  const day = date ?? todayInAppTimezone();
  if (day > todayInAppTimezone()) {
    throw HttpError.badRequest('Some fields are invalid', 'VALIDATION_ERROR', [{ path: 'date', message: 'Attendance cannot be marked for a future day' }]);
  }
  const stored = new Date(`${day}T00:00:00.000Z`);

  if (status === null) {
    await AttendanceModel.deleteOne({ doctorId, date: stored });
    return null;
  }

  await AttendanceModel.updateOne({ doctorId, date: stored }, { $set: { status } }, { upsert: true, runValidators: true });
  return { date: day, status };
}
