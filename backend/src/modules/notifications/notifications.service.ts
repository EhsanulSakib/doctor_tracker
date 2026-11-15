import type { Types } from 'mongoose';
import type { DoctorStatus, NotificationSubjectKind, NotificationType, Specialization } from '../../constants/enums.js';
import { HttpError } from '../../lib/http-error.js';
import { logger } from '../../lib/logger.js';
import { NotificationModel } from './notification.model.js';

type NotificationRecord = {
  _id: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  subject: { kind: NotificationSubjectKind; id: Types.ObjectId; name: string };
  readAt: Date | null;
  createdAt: Date;
};

export type NotificationDto = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  subject: { kind: NotificationSubjectKind; id: string; name: string };
  read: boolean;
  createdAt: string;
};

export type NotificationList = { data: NotificationDto[]; meta: { unreadCount: number } };

/** What a domain event produces; the seed adds its own `createdAt` / `readAt`. */
export type NotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  subject: { kind: NotificationSubjectKind; id: Types.ObjectId | string; name: string };
};

const NOTIFICATION_FIELDS = 'type title message subject readAt createdAt';

function toNotificationDto(n: NotificationRecord): NotificationDto {
  return {
    id: n._id.toString(),
    type: n.type,
    title: n.title,
    message: n.message,
    subject: { kind: n.subject.kind, id: n.subject.id.toString(), name: n.subject.name },
    read: n.readAt !== null && n.readAt !== undefined,
    createdAt: n.createdAt.toISOString(),
  };
}

// ─── Copy ────────────────────────────────────────────────────────────────────────────────
// Every title and message is built here, so live events and the seed read exactly the same.

/** Doctor names are usually stored as "Dr. Nusrat Jahan"; add the title only when it's missing. */
export const withTitle = (name: string) => (/^dr\.?\s/i.test(name) ? name : `Dr. ${name}`);

const patientsStillAssigned = (count: number) =>
  count === 0 ? 'No patients assigned' : `${count} patient${count === 1 ? '' : 's'} still assigned`;

type DoctorRef = { id: Types.ObjectId | string; name: string };
type PatientRef = { id: Types.ObjectId | string; name: string };

export const notificationCopy = {
  doctorAdded: (doctor: DoctorRef & { specialization: Specialization; hospital: string }): NotificationInput => ({
    type: 'doctor_added',
    title: `New doctor: ${withTitle(doctor.name)}`,
    message: `${doctor.specialization} · ${doctor.hospital}`,
    subject: { kind: 'doctor', id: doctor.id, name: doctor.name },
  }),

  /** `activePatients`: patients of this doctor who haven't recovered yet. */
  doctorUnavailable: (doctor: DoctorRef & { status: Exclude<DoctorStatus, 'active'> }, activePatients: number): NotificationInput => ({
    type: 'doctor_unavailable',
    title: `${withTitle(doctor.name)} is ${doctor.status === 'on_leave' ? 'on leave' : 'inactive'}`,
    message: patientsStillAssigned(activePatients),
    subject: { kind: 'doctor', id: doctor.id, name: doctor.name },
  }),

  patientAdmitted: (patient: PatientRef, doctor: { name: string; specialization: Specialization }): NotificationInput => ({
    type: 'patient_admitted',
    title: `New patient: ${patient.name}`,
    message: `Assigned to ${withTitle(doctor.name)} (${doctor.specialization})`,
    subject: { kind: 'patient', id: patient.id, name: patient.name },
  }),

  patientRecovered: (patient: PatientRef, doctor: { name: string } | null): NotificationInput => ({
    type: 'patient_recovered',
    title: `${patient.name} has recovered`,
    message: doctor ? `Patient of ${withTitle(doctor.name)}` : 'Doctor no longer listed',
    subject: { kind: 'patient', id: patient.id, name: patient.name },
  }),

  patientReassigned: (patient: PatientRef, newDoctor: { name: string }, oldDoctor: { name: string } | null): NotificationInput => ({
    type: 'patient_reassigned',
    title: `${patient.name} moved to ${withTitle(newDoctor.name)}`,
    message: oldDoctor ? `Previously with ${withTitle(oldDoctor.name)}` : 'Previous doctor no longer listed',
    subject: { kind: 'patient', id: patient.id, name: patient.name },
  }),
};

// ─── Writes from other modules ──────────────────────────────────────────────────────────

/**
 * Records notifications for an event that has ALREADY been saved. Never throws: a failed
 * notification is logged and the doctor/patient request still succeeds.
 */
export async function notify(...inputs: NotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await NotificationModel.insertMany(inputs);
  } catch (error) {
    logger.error({ err: error, types: inputs.map((i) => i.type) }, 'Could not record notification');
  }
}

/** Drops the notifications about a deleted doctor or patient (they would link to nothing). Never throws. */
export async function removeNotificationsFor(subjectId: Types.ObjectId | string): Promise<void> {
  try {
    await NotificationModel.deleteMany({ 'subject.id': subjectId });
  } catch (error) {
    logger.error({ err: error, subjectId: subjectId.toString() }, 'Could not remove notifications');
  }
}

// ─── API ─────────────────────────────────────────────────────────────────────────────────

export async function listNotifications(limit: number): Promise<NotificationList> {
  const [notifications, unreadCount] = await Promise.all([
    NotificationModel.find({}).select(NOTIFICATION_FIELDS).sort({ createdAt: -1, _id: -1 }).limit(limit).lean<NotificationRecord[]>(),
    NotificationModel.countDocuments({ readAt: null }),
  ]);

  return { data: notifications.map(toNotificationDto), meta: { unreadCount } };
}

/** Idempotent: the first `readAt` is kept when it's marked again. */
export async function markNotificationRead(id: string): Promise<NotificationDto> {
  const notification =
    (await NotificationModel.findOneAndUpdate({ _id: id, readAt: null }, { $set: { readAt: new Date() } }, { returnDocument: 'after' })
      .select(NOTIFICATION_FIELDS)
      .lean<NotificationRecord>()) ??
    (await NotificationModel.findById(id).select(NOTIFICATION_FIELDS).lean<NotificationRecord>());

  if (!notification) throw HttpError.notFound('Notification');
  return toNotificationDto(notification);
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const { modifiedCount } = await NotificationModel.updateMany({ readAt: null }, { $set: { readAt: new Date() } });
  return { updated: modifiedCount };
}
