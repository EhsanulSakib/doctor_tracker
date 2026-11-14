import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

export const USER_ROLES = ['admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, required: true, default: 'admin' },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);

export type PublicUser = { id: string; name: string; email: string; role: UserRole };

export function toPublicUser(user: { _id: Types.ObjectId; name: string; email: string; role: UserRole }): PublicUser {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
}
