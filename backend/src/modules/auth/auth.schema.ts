import { z } from 'zod';
import { imageUrlSchema } from '../../lib/cloudinary.js';

export const loginSchema = z.object({
  email: z
    .string('Email is required')
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email('Enter a valid email address')),
  password: z.string('Password is required').min(1, 'Password is required').max(128),
});

/** Name and photo only: the email is the sign-in identity and can't be changed (other keys are dropped). */
export const updateProfileSchema = z
  .object({
    name: z.string('Name is required').trim().min(2, 'Name is too short').max(80, 'Name is too long'),
    avatarUrl: imageUrlSchema,
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string('Enter your current password').min(1, 'Enter your current password').max(128),
    newPassword: z.string('Enter a new password').min(8, 'Use at least 8 characters').max(128, 'Use 128 characters or fewer'),
  })
  .refine((body) => body.newPassword !== body.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password different from the current one',
  });
