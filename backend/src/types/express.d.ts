import type { AccessTokenClaims } from '../modules/auth/tokens.js';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by `requireAuth` from the verified access token. */
    auth?: AccessTokenClaims;
  }
}
