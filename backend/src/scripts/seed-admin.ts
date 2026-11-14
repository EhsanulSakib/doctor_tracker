import { connectDb, disconnectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { UserModel } from '../modules/auth/user.model.js';
import { seedAdmin } from '../modules/auth/auth.seed.js';

if (!env.ADMIN_PASSWORD) {
  logger.error('Set ADMIN_PASSWORD in backend/.env before seeding the admin account');
  process.exit(1);
}

await connectDb();
await UserModel.syncIndexes();

const admin = await seedAdmin({ name: env.ADMIN_NAME, email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });
logger.info({ email: admin.email }, 'Admin account ready');

await disconnectDb();
