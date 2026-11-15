import { Types } from 'mongoose';
import type { DoctorStatus, Specialization } from '../../constants/enums.js';
import { HttpError } from '../../lib/http-error.js';
import { paginate, toSkip, type Paginated } from '../../lib/pagination.js';
import { endOfDay, startOfDay } from '../../lib/schemas.js';
import { searchKeyFilter } from '../../lib/search-key.js';
import { clearDashboardCache } from '../dashboard/dashboard.service.js';
import { PatientModel } from '../patients/patient.model.js';
import { DoctorModel } from './doctor.model.js';
import type { CreateDoctorInput, DoctorSort, ListDoctorsQuery, UpdateDoctorInput } from './doctors.schema.js';

const DOCTOR_FIELDS = 'name specialization hospital phone email status yearsOfExperience joinedAt createdAt updatedAt';

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
  createdAt: Date;
  updatedAt: Date;
};

export type DoctorDto = Omit<DoctorRecord, '_id'> & { id: string; patientCount: number };

export type DoctorOption = { id: string; name: string; specialization: Specialization };

// Explicit field list: documents can carry internal fields (searchKey, __v) that must not leak.
function toDoctorDto(doctor: DoctorRecord, patientCount: number): DoctorDto {
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
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
    patientCount,
  };
}

function buildFilter(q: ListDoctorsQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  const search = searchKeyFilter(q.search);
  if (search) filter.searchKey = search;
  if (q.specialization) filter.specialization = q.specialization;
  if (q.hospital) filter.hospital = q.hospital;
  if (q.status) filter.status = q.status;

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

/** One grouped query for the whole page instead of one count per doctor (no N+1). */
async function countPatientsByDoctor(doctorIds: Types.ObjectId[]): Promise<Map<string, number>> {
  if (doctorIds.length === 0) return new Map();

  const rows = await PatientModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { doctorId: { $in: doctorIds } } },
    { $group: { _id: '$doctorId', count: { $sum: 1 } } },
  ]);

  return new Map(rows.map((row) => [row._id.toString(), row.count]));
}

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

  const counts = await countPatientsByDoctor(doctors.map((d) => d._id));

  return paginate(
    doctors.map((d) => toDoctorDto(d, counts.get(d._id.toString()) ?? 0)),
    total,
    q,
  );
}

export async function getDoctor(id: string): Promise<DoctorDto> {
  const [doctor, patientCount] = await Promise.all([
    DoctorModel.findById(id).select(DOCTOR_FIELDS).lean<DoctorRecord>(),
    PatientModel.countDocuments({ doctorId: id }),
  ]);

  if (!doctor) throw HttpError.notFound('Doctor');
  return toDoctorDto(doctor, patientCount);
}

export async function createDoctor(input: CreateDoctorInput): Promise<DoctorDto> {
  const doctor = await DoctorModel.create(input);
  clearDashboardCache();
  return toDoctorDto(doctor.toObject<DoctorRecord>(), 0);
}

export async function updateDoctor(id: string, input: UpdateDoctorInput): Promise<DoctorDto> {
  // Load + save (instead of findOneAndUpdate) so validation and the searchKey hook run.
  const doctor = await findDoctorOrThrow(id);
  doctor.set(input);
  await doctor.save();
  clearDashboardCache();

  const patientCount = await PatientModel.countDocuments({ doctorId: doctor._id });
  return toDoctorDto(doctor.toObject<DoctorRecord>(), patientCount);
}

export async function deleteDoctor(id: string): Promise<void> {
  const patientCount = await PatientModel.countDocuments({ doctorId: id });

  if (patientCount > 0) {
    throw HttpError.conflict(
      `This doctor still has ${patientCount} patient${patientCount === 1 ? '' : 's'}. Reassign or remove them first.`,
      'DOCTOR_HAS_PATIENTS',
      { patientCount },
    );
  }

  const deleted = await DoctorModel.findByIdAndDelete(id);
  if (!deleted) throw HttpError.notFound('Doctor');
  clearDashboardCache();
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
