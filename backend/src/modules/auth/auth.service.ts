import { randomUUID } from 'node:crypto';
import type { Types } from 'mongoose';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/http-error.js';
import { logger } from '../../lib/logger.js';
import { verifyPassword } from './password.js';
import { RefreshTokenModel } from './refresh-token.model.js';
import { generateRefreshToken, hashToken, signAccessToken } from './tokens.js';
import { UserModel, toPublicUser, type PublicUser, type UserRole } from './user.model.js';

/**
 * Parallel requests from the same browser (page navigation + prefetch) can present the same
 * refresh token within milliseconds. Reuse inside this window is treated as a race, not theft.
 */
const REUSE_GRACE_MS = 10_000;

export type Session = { user: PublicUser; accessToken: string; refreshToken: string };

type SessionUser = { _id: Types.ObjectId; name: string; email: string; role: UserRole };

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
