import type { CookieOptions, Response } from 'express';
import { env, isProd } from '../../config/env.js';

export const ACCESS_COOKIE = 'dt_access';
export const REFRESH_COOKIE = 'dt_refresh';

// httpOnly: page scripts can't read the tokens (XSS can't steal them).
// sameSite=lax: browsers don't attach them to cross-site POST/PATCH/DELETE (CSRF).
// path=/: the refresh cookie must reach page navigations so the Next.js proxy can refresh.
const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  path: '/',
};

export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions,
    maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, baseOptions);
  res.clearCookie(REFRESH_COOKIE, baseOptions);
}
