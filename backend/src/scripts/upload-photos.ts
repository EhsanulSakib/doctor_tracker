/**
 * Profile photos: npm run photos
 *
 * 1. Uploads the admin's photo to Cloudinary and sets it on the admin account (ADMIN_EMAIL).
 *    Default file: ../frontend/src/assets/sakib.jpeg (override with --admin-photo=<path>).
 * 2. Gives every doctor without a photo a real stock portrait of a doctor, matched to the doctor's
 *    gender (from the seed's first-name lists). Photos come from Pexels (Pexels License: free to use and
 *    modify, no attribution required; sources listed below for credit). Cloudinary fetches each one and
 *    stores a square crop centred on the face. --force replaces existing photos.
 *
 * Re-running is safe: images keep fixed ids and are overwritten, not duplicated. `npm run seed` keeps
 * doctor photos (matched by email), so this only needs to run again for new doctors.
 */
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { isCloudinaryConfigured, uploadToCloudinary } from '../lib/cloudinary.js';
import { UserModel } from '../modules/auth/user.model.js';
import { DoctorModel } from '../modules/doctors/doctor.model.js';
import { FEMALE_FIRST_NAMES } from './seed-names.js';

/** Pexels photo ids (https://www.pexels.com/photo/<id>/), doctors in white coats, South Asian first where available. */
const PORTRAITS = {
  // Eleven different people, faces clearly visible (checked by eye; repeats of the same model left out).
  female: [
    15752232, // doctor in white coat, arms crossed
    6749773, // doctor wearing a stethoscope
    7904416, // smiling doctor, hand on chin
    4227059, // doctor in lab coat and eyeglasses
    3714743, // smiling doctor in white medical robe
    8376221, // doctor in white lab gown
    19218034, // smiling doctor in lab coat with stethoscope
    19963165, // smiling doctor portrait
    7578806, // portrait of a doctor smiling
    15641079, // smiling doctor with a file
    5214963, // doctor in a white coat and glasses
  ],
  male: [
    19438563, // Dhaka, South Asian doctor in white coat
    10826541, // South Asian doctor in white lab gown
    13156759, // doctor in white coat with stethoscope
    11268957, // Dhaka, doctor on a winter street
  ],
};

const pexelsUrl = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;
/** A 512px square centred on the face (Cloudinary's face detection), stored instead of the full photo. */
const FACE_CROP = 'c_thumb,g_face,w_512,h_512,z_0.75';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const force = process.argv.includes('--force');
const adminPhoto = resolve(arg('admin-photo') ?? '../frontend/src/assets/sakib.jpeg');

if (!isCloudinaryConfigured()) {
  console.error('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env first.');
  process.exit(1);
}

const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
/** "Dr. Nusrat Hasan" → female (first name in the seed's women's list). */
const genderOf = (name: string) => (FEMALE_FIRST_NAMES.has(name.replace(/^dr\.?\s+/i, '').split(/\s+/)[0] ?? '') ? 'female' : 'male');

await connectDb();
try {
  // 1. Admin
  const admin = await UserModel.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
  if (!admin) {
    console.warn(`No admin account with ${env.ADMIN_EMAIL}: run npm run seed first. Skipping the admin photo.`);
  } else {
    const bytes = await readFile(adminPhoto);
    const type = MIME[adminPhoto.split('.').pop()!.toLowerCase()] ?? 'image/jpeg';
    const url = await uploadToCloudinary(new Blob([bytes], { type }), { folder: `${env.CLOUDINARY_FOLDER}/admins`, publicId: `admin-${admin._id}` });
    admin.avatarUrl = url;
    await admin.save();
    console.log(`  admin    ${basename(adminPhoto)} → ${url}`);
  }

  // 2. Doctors: each gets the next unused portrait of their gender (cycling if there are more doctors than photos).
  const doctors = await DoctorModel.find(force ? {} : { $or: [{ photoUrl: null }, { photoUrl: { $exists: false } }] }, { name: 1 }).sort({ name: 1 });
  const next = { female: 0, male: 0 };
  let done = 0;
  for (const doctor of doctors) {
    const gender = genderOf(doctor.name);
    const pool = PORTRAITS[gender];
    const photoId = pool[next[gender]++ % pool.length]!;
    const url = await uploadToCloudinary(pexelsUrl(photoId), {
      folder: `${env.CLOUDINARY_FOLDER}/doctors`,
      publicId: `doctor-${doctor._id}`,
      transformation: FACE_CROP,
    });
    await DoctorModel.updateOne({ _id: doctor._id }, { $set: { photoUrl: url } });
    done += 1;
    console.log(`  doctor   ${doctor.name} (${gender}, pexels ${photoId}) → ${url}`);
  }
  console.log(`Done: admin photo ${admin ? 'set' : 'skipped'}, ${done} doctor photo${done === 1 ? '' : 's'} uploaded.`);
} finally {
  await disconnectDb();
}
