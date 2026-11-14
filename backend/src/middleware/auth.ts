import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../lib/http-error.js';
import { ACCESS_COOKIE } from '../modules/auth/cookies.js';
import { verifyAccessToken, type AccessTokenClaims } from '../modules/auth/tokens.js';
import type { UserRole } from '../modules/auth/user.model.js';

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
