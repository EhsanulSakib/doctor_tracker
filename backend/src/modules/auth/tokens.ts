import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { USER_ROLES, type UserRole } from './user.model.js';

const ISSUER = 'doctor-tracker-api';
const AUDIENCE = 'doctor-tracker-web';

export type AccessTokenClaims = { userId: string; role: UserRole };

export function signAccessToken({ userId, role }: AccessTokenClaims): string {
  return jwt.sign({ role }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });
}

/** Throws a jsonwebtoken error if the token is invalid or expired. */
export function verifyAccessToken(token: string): AccessTokenClaims {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  if (
    typeof payload !== 'object' ||
    typeof payload.sub !== 'string' ||
    !USER_ROLES.includes(payload.role as UserRole)
  ) {
    throw new jwt.JsonWebTokenError('Malformed token payload');
  }

  return { userId: payload.sub, role: payload.role as UserRole };
}

/** Opaque, unguessable refresh token (384 bits of randomness). */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
