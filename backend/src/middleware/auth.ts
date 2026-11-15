import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../lib/http-error.js';
import { ACCESS_COOKIE } from '../modules/auth/cookies.js';
import { verifyAccessToken, type AccessTokenClaims } from '../modules/auth/tokens.js';
import { USER_ROLES, type UserRole } from '../modules/auth/user.model.js';

/** Verifies the access-token cookie and attaches `{ userId, role }` to the request. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[ACCESS_COOKIE];

  if (typeof token !== 'string' || !token) {
    return next(HttpError.unauthorized());
  }

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch (err) {
    next(
      err instanceof jwt.TokenExpiredError
        ? HttpError.unauthorized('Access token expired', 'TOKEN_EXPIRED')
        : HttpError.unauthorized('Invalid access token'),
    );
  }
};

/** Must run after `requireAuth`. */
export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) return next(HttpError.unauthorized());
    if (!roles.includes(req.auth.role)) return next(HttpError.forbidden());
    next();
  };

/** Typed access to the authenticated user inside handlers behind `requireAuth`. */
export function currentUser(req: Request): AccessTokenClaims {
  if (!req.auth) throw HttpError.unauthorized();
  return req.auth;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const DEMO_READ_ONLY_MESSAGE =
  'The demo account can only view data. Sign in as the main admin to add, edit or delete records.';

/** Must run after `requireAuth`. The demo account may read anything but every write is rejected here. */
export const denyDemoWrites: RequestHandler = (req, _res, next) => {
  if (req.auth?.role === 'demo' && !SAFE_METHODS.has(req.method)) {
    return next(HttpError.forbidden(DEMO_READ_ONLY_MESSAGE, 'DEMO_READ_ONLY'));
  }
  next();
};

/** The guard for every resource router: signed in, a known role, and demo sessions read-only. */
export const staffAccess: RequestHandler[] = [requireAuth, requireRole(...USER_ROLES), denyDemoWrites];
