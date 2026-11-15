import type { Types } from 'mongoose';
import type { AttendanceStatus, DoctorStatus, PatientStatus, Specialization, Weekday } from '../../constants/enums.js';
import { todayAsDateOnly, todayInAppTimezone, weekdayOf } from '../../lib/dates.js';
import { HttpError } from '../../lib/http-error.js';
import { paginate, toSkip, type Paginated } from '../../lib/pagination.js';
import { endOfDay, startOfDay } from '../../lib/schemas.js';
import { searchKeyFilter } from '../../lib/search-key.js';
import { AttendanceModel } from '../attendance/attendance.model.js';
import { clearDashboardCache } from '../dashboard/dashboard.service.js';
import { notificationCopy, notify, removeNotificationsFor } from '../notifications/notifications.service.js';
import { PatientModel } from '../patients/patient.model.js';
import { DoctorModel } from './doctor.model.js';
import type { CHAMBER_SHIFTS, CreateDoctorInput, DoctorSort, ListDoctorsQuery, UpdateDoctorInput } from './doctors.schema.js';

const DOCTOR_FIELDS =
  'name specialization hospital phone email status yearsOfExperience joinedAt photoUrl qualifications degrees registrationNo ' +
  'consultationFee bio chamberRoom chamberDays chamberStart chamberEnd createdAt updatedAt';

// Every sort ends with _id so documents with equal values keep a stable order across pages.
const SORTS: Record<DoctorSort, Record<string, 1 | -1>> = {
  '-createdAt': { createdAt: -1, _id: -1 },
  createdAt: { createdAt: 1, _id: 1 },
  name: { name: 1, _id: 1 },
  '-name': { name: -1, _id: -1 },
  '-joinedAt': { joinedAt: -1, _id: -1 },
  joinedAt: { joinedAt: 1, _id: 1 },
  '-yearsOfExperience': { yearsOfExperience: -1, _id: -1 },
  yearsOfExperience: { yearsOfExperience: 1, _id: 1 },
};

type DoctorRecord = {
  _id: Types.ObjectId;
  name: string;
  specialization: Specialization;
  hospital: string;
  phone: string;
  email: string;
  status: DoctorStatus;
  yearsOfExperience: number;
  joinedAt: Date;
  photoUrl?: string | null;
  qualifications?: string | null;
  degrees?: Degree[];
  registrationNo?: string | null;
  consultationFee?: number | null;
  bio?: string | null;
  chamberRoom?: string | null;
  chamberDays?: Weekday[];
  chamberStart?: string | null;
  chamberEnd?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Degree = { title: string; institute: string; year: number };

type PatientStats = Record<PatientStatus, number>;

/** Today in the clinic: is it one of the doctor's chamber days, and has attendance been marked? */
type TodayInfo = { date: string; scheduled: boolean; attendance: AttendanceStatus | null };

export type DoctorDto = {
  id: string;
  name: string;
  specialization: Specialization;
  hospital: string;
  phone: string;
  email: string;
  status: DoctorStatus;
  yearsOfExperience: number;
  joinedAt: Date;
  photoUrl: string | null;
  qualifications: string | null;
  /** Oldest first. */
  degrees: Degree[];
  registrationNo: string | null;
  consultationFee: number | null;
  bio: string | null;
  chamberRoom: string | null;
  chamberDays: Weekday[];
  chamberStart: string | null;
  chamberEnd: string | null;
  createdAt: Date;
  updatedAt: Date;
  patientCount: number;
  patientStats: PatientStats;
  today: TodayInfo;
};

export type DoctorOption = { id: string; name: string; specialization: Specialization };

const EMPTY_STATS: PatientStats = { active: 0, under_treatment: 0, recovered: 0 };

// Explicit field list: documents can carry internal fields (searchKey, __v) that must not leak.
function toDoctorDto(doctor: DoctorRecord, stats: PatientStats, today: TodayInfo): DoctorDto {
  return {
    id: doctor._id.toString(),
    name: doctor.name,
    specialization: doctor.specialization,
    hospital: doctor.hospital,
    phone: doctor.phone,
    email: doctor.email,
    status: doctor.status,
    yearsOfExperience: doctor.yearsOfExperience,
    joinedAt: doctor.joinedAt,
    photoUrl: doctor.photoUrl ?? null,
    qualifications: doctor.qualifications ?? null,
    degrees: (doctor.degrees ?? []).map((d) => ({ title: d.title, institute: d.institute, year: d.year })),
    registrationNo: doctor.registrationNo ?? null,
    consultationFee: doctor.consultationFee ?? null,
    bio: doctor.bio ?? null,
    chamberRoom: doctor.chamberRoom ?? null,
    chamberDays: doctor.chamberDays ?? [],
    chamberStart: doctor.chamberStart ?? null,
    chamberEnd: doctor.chamberEnd ?? null,
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
    patientCount: stats.active + stats.under_treatment + stats.recovered,
    patientStats: stats,
    today,
  };
}

const SHIFT_START: Record<(typeof CHAMBER_SHIFTS)[number], Record<string, string>> = {
  morning: { $lt: '12:00' },
  afternoon: { $gte: '12:00', $lt: '17:00' },
  evening: { $gte: '17:00' },
};

function buildFilter(q: ListDoctorsQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  const search = searchKeyFilter(q.search);
  if (search) filter.searchKey = search;
  if (q.specialization) filter.specialization = q.specialization;
  if (q.hospital) filter.hospital = q.hospital;
  if (q.status) filter.status = q.status;
  if (q.day) filter.chamberDays = q.day === 'today' ? weekdayOf(todayInAppTimezone()) : q.day;
  if (q.shift) filter.chamberStart = SHIFT_START[q.shift];

  if (q.joinedFrom || q.joinedTo) {
    filter.joinedAt = {
      ...(q.joinedFrom && { $gte: startOfDay(q.joinedFrom) }),
      ...(q.joinedTo && { $lte: endOfDay(q.joinedTo) }),
    };
  }

  if (q.expMin !== undefined || q.expMax !== undefined) {
    filter.yearsOfExperience = {
      ...(q.expMin !== undefined && { $gte: q.expMin }),
      ...(q.expMax !== undefined && { $lte: q.expMax }),
    };
  }

  return filter;
}

/** Patients per doctor and status: one grouped query for the whole page (no N+1). */
async function patientStatsByDoctor(doctorIds: Types.ObjectId[]): Promise<Map<string, PatientStats>> {
  if (doctorIds.length === 0) return new Map();

  const rows = await PatientModel.aggregate<{ _id: { doctorId: Types.ObjectId; status: PatientStatus }; count: number }>([
    { $match: { doctorId: { $in: doctorIds } } },
    { $group: { _id: { doctorId: '$doctorId', status: '$status' }, count: { $sum: 1 } } },
  ]);

  const stats = new Map<string, PatientStats>();
  for (const row of rows) {
    const key = row._id.doctorId.toString();
    const entry = stats.get(key) ?? { ...EMPTY_STATS };
    entry[row._id.status] = row.count;
    stats.set(key, entry);
  }
  return stats;
}

/** Turns a page of doctor records into DTOs: patient numbers and today's attendance, two queries in all. */
async function toDtos(doctors: DoctorRecord[]): Promise<DoctorDto[]> {
  const ids = doctors.map((d) => d._id);
  const date = todayInAppTimezone();
  const weekday = weekdayOf(date);

  const [stats, attendance] = await Promise.all([
    patientStatsByDoctor(ids),
    ids.length ? AttendanceModel.find({ date: todayAsDateOnly(), doctorId: { $in: ids } }, { doctorId: 1, status: 1 }).lean() : [],
  ]);
  const todayByDoctor = new Map(attendance.map((a) => [a.doctorId.toString(), a.status]));

  return doctors.map((d) =>
    toDoctorDto(d, stats.get(d._id.toString()) ?? { ...EMPTY_STATS }, {
      date,
      scheduled: (d.chamberDays ?? []).includes(weekday),
      attendance: todayByDoctor.get(d._id.toString()) ?? null,
    }),
  );
}

/** Chamber hours must end after they start, also when only one of them changes. */
function assertHoursOrdered(doctor: { chamberStart?: string | null; chamberEnd?: string | null }) {
  if (doctor.chamberStart && doctor.chamberEnd && doctor.chamberEnd <= doctor.chamberStart) {
    throw HttpError.badRequest('Some fields are invalid', 'VALIDATION_ERROR', [
      { path: 'chamberEnd', message: 'End time must be after the start time' },
    ]);
  }
}

/** Active → on leave / inactive: the admin may need to move this doctor's patients. */
const becameUnavailable = (before: DoctorStatus, after: DoctorStatus) => before === 'active' && after !== 'active';

async function findDoctorOrThrow(id: string) {
  const doctor = await DoctorModel.findById(id);
  if (!doctor) throw HttpError.notFound('Doctor');
  return doctor;
}

export async function listDoctors(q: ListDoctorsQuery): Promise<Paginated<DoctorDto>> {
  const filter = buildFilter(q);

  const [doctors, total] = await Promise.all([
    DoctorModel.find(filter).select(DOCTOR_FIELDS).sort(SORTS[q.sort]).skip(toSkip(q)).limit(q.limit).lean<DoctorRecord[]>(),
    DoctorModel.countDocuments(filter),
  ]);

  return paginate(await toDtos(doctors), total, q);
}

export async function getDoctor(id: string): Promise<DoctorDto> {
  const doctor = await DoctorModel.findById(id).select(DOCTOR_FIELDS).lean<DoctorRecord>();
  if (!doctor) throw HttpError.notFound('Doctor');
  return (await toDtos([doctor]))[0]!;
}

/** The list form of the degrees: "MBBS, FCPS (Medicine)". */
const qualificationsOf = (degrees: Degree[]) => degrees.map((d) => d.title).join(', ') || undefined;

export async function createDoctor(input: CreateDoctorInput): Promise<DoctorDto> {
  const doctor = await DoctorModel.create({ ...input, qualifications: input.degrees.length ? qualificationsOf(input.degrees) : input.qualifications });
  clearDashboardCache();
  await notify(notificationCopy.doctorAdded({ id: doctor._id, name: doctor.name, specialization: doctor.specialization, hospital: doctor.hospital }));
  return (await toDtos([doctor.toObject<DoctorRecord>()]))[0]!;
}

export async function updateDoctor(id: string, input: UpdateDoctorInput): Promise<DoctorDto> {
  // Load + save (instead of findOneAndUpdate) so validation and the searchKey hook run.
  const doctor = await findDoctorOrThrow(id);
  const previousStatus = doctor.status;
  doctor.set(input);
  if (input.degrees) doctor.set('qualifications', qualificationsOf(input.degrees));
  assertHoursOrdered(doctor);
  await doctor.save();
  clearDashboardCache();

  const status = doctor.status;
  const [dto] = await toDtos([doctor.toObject<DoctorRecord>()]);
  if (becameUnavailable(previousStatus, status) && status !== 'active') {
    const stillUnderCare = dto!.patientStats.active + dto!.patientStats.under_treatment;
    await notify(notificationCopy.doctorUnavailable({ id: doctor._id, name: doctor.name, status }, stillUnderCare));
  }

  return dto!;
}

export type DeleteDoctorResult = { unassigned: number };

/**
 * Deletes the doctor for good (with their attendance and notifications). Their patients stay: each
 * patient has exactly one doctor, so they become unassigned ("N/A") until someone picks a new doctor.
 */
export async function deleteDoctor(id: string): Promise<DeleteDoctorResult> {
  const deleted = await DoctorModel.findByIdAndDelete(id);
  if (!deleted) throw HttpError.notFound('Doctor');

  const [{ modifiedCount }] = await Promise.all([
    PatientModel.updateMany({ doctorId: deleted._id }, { $set: { doctorId: null } }),
    AttendanceModel.deleteMany({ doctorId: deleted._id }),
  ]);
  clearDashboardCache();
  await removeNotificationsFor(deleted._id);
  return { unassigned: modifiedCount };
}

export async function listHospitals(): Promise<string[]> {
  const hospitals = await DoctorModel.distinct('hospital');
  return hospitals.sort((a, b) => a.localeCompare(b));
}

/** Lightweight id + name list for dropdowns (patient forms and filters). */
export async function listDoctorOptions(search: string | undefined): Promise<DoctorOption[]> {
  const searchKey = searchKeyFilter(search);

  const doctors = await DoctorModel.find(searchKey ? { searchKey } : {})
    .select('name specialization')
    .sort({ name: 1, _id: 1 })
    .limit(20)
    .lean<Pick<DoctorRecord, '_id' | 'name' | 'specialization'>[]>();

  return doctors.map((d) => ({ id: d._id.toString(), name: d.name, specialization: d.specialization }));
}
