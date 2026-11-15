import type { Types } from 'mongoose';
import type { Condition, Gender, PatientStatus, Specialization } from '../../constants/enums.js';
import { HttpError } from '../../lib/http-error.js';
import { paginate, toSkip, type Paginated } from '../../lib/pagination.js';
import { endOfDay, startOfDay } from '../../lib/schemas.js';
import { searchKeyFilter } from '../../lib/search-key.js';
import { clearDashboardCache } from '../dashboard/dashboard.service.js';
import { DoctorModel } from '../doctors/doctor.model.js';
import { PatientModel } from './patient.model.js';
import type {
  CreateDoctorPatientInput,
  CreatePatientInput,
  ListDoctorPatientsQuery,
  ListPatientsQuery,
  PatientSort,
  UpdatePatientInput,
} from './patients.schema.js';

const PATIENT_FIELDS = 'name age gender phone email condition status admissionDate notes doctorId createdAt updatedAt';

// Every sort ends with _id so documents with equal values keep a stable order across pages.
const SORTS: Record<PatientSort, Record<string, 1 | -1>> = {
  '-admissionDate': { admissionDate: -1, _id: -1 },
  admissionDate: { admissionDate: 1, _id: 1 },
  name: { name: 1, _id: 1 },
  '-name': { name: -1, _id: -1 },
  '-createdAt': { createdAt: -1, _id: -1 },
};

type PatientRecord = {
  _id: Types.ObjectId;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  email?: string | null;
  condition: Condition;
  status: PatientStatus;
  admissionDate: Date;
  notes?: string | null;
  doctorId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

type DoctorSummaryRecord = { _id: Types.ObjectId; name: string; specialization: Specialization };

export type DoctorSummary = { id: string; name: string; specialization: Specialization };

export type PatientDto = Omit<PatientRecord, '_id' | 'email' | 'notes' | 'doctorId'> & {
  id: string;
  email: string | null;
  notes: string | null;
  doctorId: string;
  /** `null` only if the doctor no longer exists (the doctor delete guard should prevent that). */
  doctor: DoctorSummary | null;
};

// Explicit field list: documents can carry internal fields (searchKey, __v) that must not leak.
// Optional fields are always present (null when empty) so clients get one stable shape.
function toPatientDto(patient: PatientRecord, doctor: DoctorSummary | undefined): PatientDto {
  return {
    id: patient._id.toString(),
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email ?? null,
    condition: patient.condition,
    status: patient.status,
    admissionDate: patient.admissionDate,
    notes: patient.notes ?? null,
    doctorId: patient.doctorId.toString(),
    doctor: doctor ?? null,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
}

const toDoctorSummary = (doctor: DoctorSummaryRecord): DoctorSummary => ({
  id: doctor._id.toString(),
  name: doctor.name,
  specialization: doctor.specialization,
});

/** A `doctorId` in the request body points at a doctor that doesn't exist. */
const doctorNotFound = () => new HttpError(404, 'DOCTOR_NOT_FOUND', 'Doctor not found', { fields: ['doctorId'] });

async function findDoctorSummary(id: string | Types.ObjectId): Promise<DoctorSummary | undefined> {
  const doctor = await DoctorModel.findById(id).select('name specialization').lean<DoctorSummaryRecord>();
  return doctor ? toDoctorSummary(doctor) : undefined;
}

/**
 * The doctors behind one page of patients, in a single `$in` query (what `populate` would do).
 * Done by hand so the result is typed and the patient keeps its `doctorId` even if a doctor is missing.
 */
async function findDoctorSummaries(ids: Types.ObjectId[]): Promise<Map<string, DoctorSummary>> {
  const uniqueIds = [...new Set(ids.map((id) => id.toString()))];
  if (uniqueIds.length === 0) return new Map();

  const doctors = await DoctorModel.find({ _id: { $in: uniqueIds } })
    .select('name specialization')
    .lean<DoctorSummaryRecord[]>();

  return new Map(doctors.map((d) => [d._id.toString(), toDoctorSummary(d)]));
}

function buildFilter(q: ListPatientsQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  const search = searchKeyFilter(q.search);
  if (search) filter.searchKey = search;
  if (q.doctorId) filter.doctorId = q.doctorId;
  if (q.condition) filter.condition = q.condition;
  if (q.status) filter.status = q.status;
  if (q.gender) filter.gender = q.gender;

  if (q.admittedFrom || q.admittedTo) {
    filter.admissionDate = {
      ...(q.admittedFrom && { $gte: startOfDay(q.admittedFrom) }),
      ...(q.admittedTo && { $lte: endOfDay(q.admittedTo) }),
    };
  }

  return filter;
}

/** One page of patients and the total match count, in parallel. */
function findPage(q: ListPatientsQuery) {
  const filter = buildFilter(q);

  return Promise.all([
    PatientModel.find(filter).select(PATIENT_FIELDS).sort(SORTS[q.sort]).skip(toSkip(q)).limit(q.limit).lean<PatientRecord[]>(),
    PatientModel.countDocuments(filter),
  ]);
}

async function insertPatient(input: CreateDoctorPatientInput, doctor: DoctorSummary): Promise<PatientDto> {
  const patient = await PatientModel.create({ ...input, doctorId: doctor.id });
  clearDashboardCache();
  return toPatientDto(patient.toObject<PatientRecord>(), doctor);
}

export async function listPatients(q: ListPatientsQuery): Promise<Paginated<PatientDto>> {
  const [patients, total] = await findPage(q);
  const doctors = await findDoctorSummaries(patients.map((p) => p.doctorId));

  return paginate(
    patients.map((p) => toPatientDto(p, doctors.get(p.doctorId.toString()))),
    total,
    q,
  );
}

export async function listDoctorPatients(doctorId: string, q: ListDoctorPatientsQuery): Promise<Paginated<PatientDto>> {
  // Every row has the same doctor, so load it once, alongside the page queries rather than before them.
  const [doctor, [patients, total]] = await Promise.all([findDoctorSummary(doctorId), findPage({ ...q, doctorId })]);

  if (!doctor) throw HttpError.notFound('Doctor');
  return paginate(
    patients.map((p) => toPatientDto(p, doctor)),
    total,
    q,
  );
}

export async function getPatient(id: string): Promise<PatientDto> {
  const patient = await PatientModel.findById(id).select(PATIENT_FIELDS).lean<PatientRecord>();
  if (!patient) throw HttpError.notFound('Patient');

  return toPatientDto(patient, await findDoctorSummary(patient.doctorId));
}

export async function createPatient({ doctorId, ...input }: CreatePatientInput): Promise<PatientDto> {
  const doctor = await findDoctorSummary(doctorId);
  if (!doctor) throw doctorNotFound();

  return insertPatient(input, doctor);
}

export async function createDoctorPatient(doctorId: string, input: CreateDoctorPatientInput): Promise<PatientDto> {
  const doctor = await findDoctorSummary(doctorId);
  if (!doctor) throw HttpError.notFound('Doctor');

  return insertPatient(input, doctor);
}

export async function updatePatient(id: string, input: UpdatePatientInput): Promise<PatientDto> {
  // On reassignment, check the new doctor while the patient loads.
  const [patient, newDoctor] = await Promise.all([
    PatientModel.findById(id),
    input.doctorId ? findDoctorSummary(input.doctorId) : undefined,
  ]);

  if (!patient) throw HttpError.notFound('Patient');
  if (input.doctorId && !newDoctor) throw doctorNotFound();

  // Load + save (instead of findOneAndUpdate) so validation and the searchKey hook run.
  // A cleared optional field arrives as `undefined`, which save() turns into $unset.
  patient.set(input);
  await patient.save();
  clearDashboardCache();

  const doctor = newDoctor ?? (await findDoctorSummary(patient.doctorId));
  return toPatientDto(patient.toObject<PatientRecord>(), doctor);
}

export async function deletePatient(id: string): Promise<void> {
  const { deletedCount } = await PatientModel.deleteOne({ _id: id });
  if (deletedCount === 0) throw HttpError.notFound('Patient');
  clearDashboardCache();
}
