import { randomBytes, randomUUID } from 'node:crypto';
import type { Types } from 'mongoose';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/http-error.js';
import { logger } from '../../lib/logger.js';
import { hashPassword, verifyPassword } from './password.js';
import { RefreshTokenModel } from './refresh-token.model.js';
import { generateRefreshToken, hashToken, signAccessToken } from './tokens.js';
import { UserModel, toPublicUser, type PublicUser, type UserRole } from './user.model.js';

/**
 * Parallel requests from the same browser (page navigation + prefetch) can present the same
 * refresh token within milliseconds. Reuse inside this window is treated as a race, not theft.
 */
const REUSE_GRACE_MS = 10_000;

export type Session = { user: PublicUser; accessToken: string; refreshToken: string };

type SessionUser = { _id: Types.ObjectId; name: string; email: string; role: UserRole; avatarUrl?: string | null };

const sessionExpired = () => HttpError.unauthorized('Your session has expired. Please sign in again.', 'SESSION_EXPIRED');
const sessionRevoked = () => HttpError.unauthorized('Your session was ended. Please sign in again.', 'SESSION_REVOKED');

async function issueSession(user: SessionUser, family: string = randomUUID()): Promise<Session> {
  const refreshToken = generateRefreshToken();

  await RefreshTokenModel.create({
    userId: user._id,
    family,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
  });

  return {
    user: toPublicUser(user),
    accessToken: signAccessToken({ userId: user._id.toString(), role: user.role }),
    refreshToken,
  };
}

async function revokeFamily(family: string) {
  await RefreshTokenModel.updateMany({ family, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function login(email: string, password: string): Promise<Session> {
  const user = await UserModel.findOne({ email }).select('+passwordHash').lean();
  const valid = await verifyPassword(password, user?.passwordHash);

  if (!user || !valid) {
    throw HttpError.unauthorized('Email or password is incorrect', 'INVALID_CREDENTIALS');
  }

  return issueSession(user);
}

/**
 * Signs in the read-only demo account, creating it on first use. Its password is random and never
 * stored anywhere, so this endpoint is the only way in, and it can never be signed in as a real admin.
 */
export async function demoLogin(): Promise<Session> {
  const email = env.DEMO_EMAIL.toLowerCase();
  if (email === env.ADMIN_EMAIL.toLowerCase()) {
    throw HttpError.forbidden('Demo login is not available', 'DEMO_DISABLED');
  }

  const existing = await UserModel.findOne({ email }).lean();
  if (existing) {
    if (existing.role !== 'demo') throw HttpError.forbidden('Demo login is not available', 'DEMO_DISABLED');
    return issueSession(existing);
  }

  const passwordHash = await hashPassword(randomBytes(32).toString('base64url'));
  const user = await UserModel.findOneAndUpdate(
    { email },
    { $setOnInsert: { name: env.DEMO_NAME, email, passwordHash, role: 'demo' } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).lean();

  return issueSession(user);
}

export async function refresh(rawToken: string | undefined): Promise<Session> {
  if (!rawToken) throw sessionExpired();

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  // Atomically mark the token as used, so two concurrent refreshes can't both rotate it.
  const claimed = await RefreshTokenModel.findOneAndUpdate(
    { tokenHash, rotatedAt: null, revokedAt: null, expiresAt: { $gt: now } },
    { $set: { rotatedAt: now } },
    { returnDocument: 'after' },
  ).lean();

  const record = claimed ?? (await RefreshTokenModel.findOne({ tokenHash }).lean());

  if (!record || record.expiresAt <= now) throw sessionExpired();
  if (record.revokedAt) throw sessionRevoked();

  if (!claimed) {
    const rotatedAgo = now.getTime() - (record.rotatedAt?.getTime() ?? 0);

    if (rotatedAgo > REUSE_GRACE_MS) {
      // An old token came back long after it was replaced: someone may have copied it.
      await revokeFamily(record.family);
      logger.warn({ userId: record.userId.toString() }, 'Refresh token reuse detected, session revoked');
      throw sessionRevoked();
    }
  }

  const user = await UserModel.findById(record.userId).lean();
  if (!user) {
    await revokeFamily(record.family);
    throw sessionRevoked();
  }

  return issueSession(user, record.family);
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;

  const record = await RefreshTokenModel.findOne({ tokenHash: hashToken(rawToken) }).lean();
  if (record) await revokeFamily(record.family);
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await UserModel.findById(userId).lean();
  if (!user) throw HttpError.unauthorized('Account no longer exists', 'UNAUTHENTICATED');
  return toPublicUser(user);
}

export async function updateProfile(userId: string, changes: { name?: string; avatarUrl?: string | null }): Promise<PublicUser> {
  const user = await UserModel.findByIdAndUpdate(userId, { $set: changes }, { returnDocument: 'after', runValidators: true }).lean();
  if (!user) throw HttpError.unauthorized('Account no longer exists', 'UNAUTHENTICATED');
  return toPublicUser(user);
}

/**
 * Checks the current password, stores the new one, then signs out every other session (all refresh
 * tokens revoked) and returns a fresh session for the browser that made the change.
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<Session> {
  const user = await UserModel.findById(userId).select('+passwordHash').lean();
  if (!user) throw HttpError.unauthorized('Account no longer exists', 'UNAUTHENTICATED');

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new HttpError(400, 'WRONG_PASSWORD', 'Current password is incorrect', { fields: ['currentPassword'] });
  }

  await UserModel.updateOne({ _id: user._id }, { $set: { passwordHash: await hashPassword(newPassword) } });
  await RefreshTokenModel.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  return issueSession(user);
}
