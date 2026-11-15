import { createHash } from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { HttpError } from './http-error.js';

/**
 * Signed direct uploads: the browser sends the file straight to Cloudinary with a short-lived signature
 * from us, so image bytes never pass through this API and the API secret never leaves the server.
 */
export const isCloudinaryConfigured = () =>
  Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

export const UPLOAD_KINDS = ['avatar', 'doctor'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

/** Cloudinary's scheme: SHA-1 of the alphabetically sorted params joined with `&`, then the secret. */
export function signUpload(kind: UploadKind, now = Date.now()): UploadSignature {
  if (!isCloudinaryConfigured()) {
    throw new HttpError(503, 'UPLOADS_DISABLED', 'Image uploads are not configured on the server');
  }

  const timestamp = Math.floor(now / 1000);
  const folder = `${env.CLOUDINARY_FOLDER}/${kind === 'avatar' ? 'admins' : 'doctors'}`;
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash('sha1').update(`${toSign}${env.CLOUDINARY_API_SECRET}`).digest('hex');

  return { cloudName: env.CLOUDINARY_CLOUD_NAME!, apiKey: env.CLOUDINARY_API_KEY!, timestamp, folder, signature };
}

/**
 * Server-side upload (scripts only; the app itself uploads from the browser). `file` is the image
 * bytes or a public URL Cloudinary fetches itself. A fixed `publicId` with overwrite makes re-runs
 * replace the same image instead of piling up copies. Returns the HTTPS delivery URL.
 */
export async function uploadToCloudinary(
  file: Blob | string,
  { folder, publicId, transformation }: { folder: string; publicId: string; /** Applied before storing, e.g. a face crop. */ transformation?: string },
): Promise<string> {
  if (!isCloudinaryConfigured()) throw new Error('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET first');

  const params: Record<string, string> = {
    folder,
    overwrite: 'true',
    public_id: publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    ...(transformation && { transformation }),
  };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  const form = new FormData();
  for (const [key, value] of Object.entries(params)) form.append(key, value);
  form.append('api_key', env.CLOUDINARY_API_KEY!);
  form.append('signature', createHash('sha1').update(`${toSign}${env.CLOUDINARY_API_SECRET}`).digest('hex'));
  form.append('file', file);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: form });
  const body = (await res.json()) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !body.secure_url) throw new Error(`Cloudinary upload failed: ${body.error?.message ?? res.status}`);
  return body.secure_url;
}

/**
 * A stored image must be one delivered by OUR Cloudinary account, so nobody can point a photo at an
 * arbitrary URL. `null` removes the photo.
 */
export const imageUrlSchema = z
  .url('Enter a valid image URL')
  .max(500)
  .refine(
    (url) =>
      Boolean(env.CLOUDINARY_CLOUD_NAME) && url.startsWith(`https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`),
    'Upload the image through the app',
  )
  .nullable();
