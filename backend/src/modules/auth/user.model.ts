import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

/** `demo` is the public showcase account: it can read everything but every write is rejected. */
export const USER_ROLES = ['admin', 'demo'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, required: true, default: 'admin' },
    // Cloudinary URL of the profile photo; null shows initials.
    avatarUrl: { type: String, default: null, maxlength: 500 },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);

export type PublicUser = { id: string; name: string; email: string; role: UserRole; avatarUrl: string | null };

export function toPublicUser(user: { _id: Types.ObjectId; name: string; email: string; role: UserRole; avatarUrl?: string | null }): PublicUser {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl ?? null };
}
