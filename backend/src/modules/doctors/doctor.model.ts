import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { DOCTOR_STATUSES, SPECIALIZATIONS, WEEKDAYS } from '../../constants/enums.js';
import { TIME_PATTERN } from '../../lib/schemas.js';
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
    // Optional Cloudinary photo URL; null shows initials.
    photoUrl: { type: String, default: null, maxlength: 500 },

    // Profile details (all optional): degrees, BMDC registration, fee in BDT, short bio.
    qualifications: { type: String, trim: true, maxlength: 200 },
    // Degrees in the order they were earned: "MBBS · Dhaka Medical College · 2006". `qualifications`
    // is the short form shown in lists ("MBBS, FCPS (Medicine)"), kept in step when degrees change.
    degrees: {
      type: [
        {
          _id: false,
          title: { type: String, required: true, trim: true, maxlength: 60 },
          institute: { type: String, required: true, trim: true, maxlength: 120 },
          year: { type: Number, required: true, min: 1950, max: 2100 },
        },
      ],
      default: [],
    },
    registrationNo: { type: String, trim: true, maxlength: 30 },
    consultationFee: { type: Number, min: 0, max: 100_000 },
    bio: { type: String, trim: true, maxlength: 600 },

    // Chamber: where and when the doctor sees patients. Times are "HH:MM" in APP_TIMEZONE.
    chamberRoom: { type: String, trim: true, maxlength: 120 },
    chamberDays: { type: [{ type: String, enum: WEEKDAYS }], default: [] },
    chamberStart: { type: String, match: TIME_PATTERN },
    chamberEnd: { type: String, match: TIME_PATTERN },
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
