import { rateLimit, type Options } from 'express-rate-limit';
import { isTest } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const base: Partial<Options> = {
  windowMs: FIFTEEN_MINUTES,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => isTest,
  handler: (_req, _res, next) => {
    next(new HttpError(429, 'RATE_LIMITED', 'Too many requests. Please wait a moment and try again.'));
  },
};

/** Applied to every /api route. Generous: it only stops abuse, not normal use. */
export const apiLimiter = rateLimit({ ...base, limit: 600 });

/** Brute-force protection for the login form. Successful logins don't count. */
export const loginLimiter = rateLimit({ ...base, limit: 10, skipSuccessfulRequests: true });

/** Token refreshes happen at most every few minutes per tab. */
export const refreshLimiter = rateLimit({ ...base, limit: 60 });
