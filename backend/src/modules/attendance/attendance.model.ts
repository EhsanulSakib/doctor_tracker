import { Schema, model, type InferSchemaType } from 'mongoose';
import { ATTENDANCE_STATUSES } from '../../constants/enums.js';

/** One doctor, one calendar day (UTC midnight, like every date-only field): present, absent or on leave. */
const attendanceSchema = new Schema(
  {
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true },
  },
  { timestamps: true },
);

// One record per doctor per day; also serves "this doctor's last 30 days" (newest first).
attendanceSchema.index({ doctorId: 1, date: -1 }, { unique: true });
// "Who is in today" across the doctors list.
attendanceSchema.index({ date: 1, doctorId: 1 });

export type Attendance = InferSchemaType<typeof attendanceSchema>;
export const AttendanceModel = model('Attendance', attendanceSchema);
