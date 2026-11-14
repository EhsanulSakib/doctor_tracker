import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../lib/logger.js';

// Reject filter keys that are not in the schema instead of silently ignoring them.
mongoose.set('strictQuery', true);

export async function connectDb(uri: string = env.MONGODB_URI): Promise<void> {
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
