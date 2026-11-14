import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { DOCTOR_STATUSES, SPECIALIZATIONS } from '../../constants/enums.js';
import { buildSearchKey } from '../../lib/search-key.js';

const doctorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    specialization: { type: String, enum: SPECIALIZATIONS, required: true },
    hospital: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    status: { type: String, enum: DOCTOR_STATUSES, required: true, default: 'active' },
    yearsOfExperience: { type: Number, required: true, min: 0, max: 60 },
    joinedAt: { type: Date, required: true },
    // Derived from name/email/phone for indexed prefix search. Never sent to clients.
    searchKey: { type: [String], select: false, default: [] },
  },
  { timestamps: true },
);

// Runs on create, save() and insertMany(), so searchKey can never go stale.
doctorSchema.pre('validate', function () {
  if (this.isNew || this.isModified('name') || this.isModified('email') || this.isModified('phone')) {
    this.searchKey = buildSearchKey({ name: this.name, email: this.email, phone: this.phone });
  }
});

// Equality fields first, then the sort field, then _id so pages are stable (ESR rule).
doctorSchema.index({ email: 1 }, { unique: true });
doctorSchema.index({ searchKey: 1 });
doctorSchema.index({ createdAt: -1, _id: -1 });
doctorSchema.index({ specialization: 1, createdAt: -1, _id: -1 });
doctorSchema.index({ status: 1, createdAt: -1, _id: -1 });
doctorSchema.index({ hospital: 1, createdAt: -1, _id: -1 });
doctorSchema.index({ joinedAt: -1, _id: -1 });
doctorSchema.index({ name: 1, _id: 1 });

export type Doctor = InferSchemaType<typeof doctorSchema>;
export type DoctorDoc = Doctor & { _id: Types.ObjectId };

export const DoctorModel = model('Doctor', doctorSchema);
