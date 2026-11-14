import bcrypt from 'bcryptjs';
import { isTest } from '../../config/env.js';

// Cost 12 in real use (~0.3 s per hash). Tests use the minimum so the suite stays fast.
const ROUNDS = isTest ? 4 : 12;

let dummyHash: Promise<string> | undefined;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

/**
 * Compares against a dummy hash when the user doesn't exist, so a wrong email takes
 * as long as a wrong password and response time doesn't reveal which emails are registered.
 */
export async function verifyPassword(password: string, hash: string | undefined): Promise<boolean> {
  dummyHash ??= bcrypt.hash('dummy-password-for-timing', ROUNDS);
  const matches = await bcrypt.compare(password, hash ?? (await dummyHash));
  return hash !== undefined && matches;
}
