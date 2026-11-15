/**
 * Keeps two databases holding the same data: the working database (MONGODB_URI, local) and
 * the shared copy (SYNC_TARGET_URI, e.g. Atlas).
 *
 *   npm run db:sync                     preview: document counts on both sides, nothing written
 *   npm run db:sync -- --yes            push:  MONGODB_URI     → SYNC_TARGET_URI
 *   npm run db:sync -- --pull --yes     pull:  SYNC_TARGET_URI → MONGODB_URI
 *
 * Users, doctors and patients are copied exactly (same _id, timestamps and searchKey), replacing
 * what the destination had. Then the destination gets the schema's indexes. Refresh tokens are not
 * copied: sessions belong to one database, so the destination's are cleared (log in again there).
 * Not transactional: if a run fails halfway, run it again.
 */
import mongoose, { type Connection, type Model } from 'mongoose';
import { env } from '../config/env.js';
import { RefreshTokenModel } from '../modules/auth/refresh-token.model.js';
import { UserModel } from '../modules/auth/user.model.js';
import { DoctorModel } from '../modules/doctors/doctor.model.js';
import { PatientModel } from '../modules/patients/patient.model.js';

const COPIED: Model<any>[] = [UserModel, DoctorModel, PatientModel];
const CLEARED: Model<any>[] = [RefreshTokenModel];
const BATCH_SIZE = 1000;

const args = new Set(process.argv.slice(2));
const pull = args.has('--pull');
const write = args.has('--yes');

if (!env.SYNC_TARGET_URI) {
  console.error('SYNC_TARGET_URI is not set in backend/.env (see .env.example).');
  process.exit(1);
}

const connect = (uri: string) => mongoose.createConnection(uri, { serverSelectionTimeoutMS: 15_000, autoIndex: false }).asPromise();

// Never print a URI: it can contain credentials.
const label = (conn: Connection) => `${conn.host}/${conn.name}`;

const [local, shared] = await Promise.all([connect(env.MONGODB_URI), connect(env.SYNC_TARGET_URI)]);
const [source, target] = pull ? [shared, local] : [local, shared];

try {
  if (label(source) === label(target)) {
    throw new Error(`MONGODB_URI and SYNC_TARGET_URI point at the same database (${label(source)}).`);
  }

  console.log(`${pull ? 'PULL' : 'PUSH'}  ${label(source)}  →  ${label(target)}\n`);

  for (const model of [...COPIED, ...CLEARED]) {
    const name = model.collection.collectionName;
    const [from, to] = await Promise.all([
      source.collection(name).countDocuments(),
      target.collection(name).countDocuments(),
    ]);
    const action = COPIED.includes(model) ? `${from} → replaces ${to}` : `not copied, ${to} cleared`;
    console.log(`  ${name.padEnd(14)} ${action}`);
  }

  if (!write) {
    console.log('\nPreview only. Re-run with --yes to write to the destination.');
  } else {
    for (const model of COPIED) {
      const name = model.collection.collectionName;
      const docs = await source.collection(name).find().toArray();
      const destination = target.collection(name);

      // Delete first so unique indexes (e.g. email) can't clash with the incoming copies.
      await destination.deleteMany({});
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        await destination.insertMany(docs.slice(i, i + BATCH_SIZE));
      }
    }

    for (const model of CLEARED) {
      await target.collection(model.collection.collectionName).deleteMany({});
    }

    // Same indexes as the schemas declare (creates missing ones, drops stale ones).
    for (const model of [...COPIED, ...CLEARED]) {
      await target.model(model.modelName, model.schema).syncIndexes();
    }

    console.log(`\nDone: ${label(target)} now matches ${label(source)}.`);
  }
} finally {
  await Promise.all([local.close(), shared.close()]);
}
