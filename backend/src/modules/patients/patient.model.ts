import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { CONDITIONS, GENDERS, PATIENT_STATUSES } from '../../constants/enums.js';
import { buildSearchKey } from '../../lib/search-key.js';

const patientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    age: { type: Number, required: true, min: 0, max: 120 },
    gender: { type: String, enum: GENDERS, required: true },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    condition: { type: String, enum: CONDITIONS, required: true },
    status: { type: String, enum: PATIENT_STATUSES, required: true, default: 'active' },
    admissionDate: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 1000 },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    searchKey: { type: [String], select: false, default: [] },
  },
  { timestamps: true },
);

patientSchema.pre('validate', function () {
  if (this.isNew || this.isModified('name') || this.isModified('email') || this.isModified('phone')) {
    this.searchKey = buildSearchKey({ name: this.name, email: this.email, phone: this.phone });
  }
});

// { doctorId, admissionDate } serves a doctor's patient list, per-doctor counts and the
// "does this doctor still have patients?" check used before deleting a doctor.
patientSchema.index({ doctorId: 1, admissionDate: -1, _id: -1 });
patientSchema.index({ searchKey: 1 });
patientSchema.index({ admissionDate: -1, _id: -1 });
patientSchema.index({ condition: 1, admissionDate: -1, _id: -1 });
patientSchema.index({ status: 1, admissionDate: -1, _id: -1 });
// Sort by name (walked backwards for "-name"). Gender and the rare "-createdAt" sort have no
// dedicated index: gender has 3 values (low selectivity) and is applied on top of another index.
patientSchema.index({ name: 1, _id: 1 });

export type Patient = InferSchemaType<typeof patientSchema>;
export type PatientDoc = Patient & { _id: Types.ObjectId };

export const PatientModel = model('Patient', patientSchema);
