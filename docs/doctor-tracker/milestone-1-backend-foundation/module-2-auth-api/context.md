# Module 1.2 — Auth API: Context

## Files
```
src/modules/auth/
├── user.model.ts            User schema, USER_ROLES, toPublicUser()
├── refresh-token.model.ts   RefreshToken schema (+ TTL index)
├── tokens.ts                JWT sign/verify, refresh token generate/hash
├── cookies.ts               cookie names + set/clear helpers
├── password.ts              bcrypt hash/verify with timing-safe dummy compare
├── auth.schema.ts           Zod login schema
├── auth.service.ts          login / refresh / logout / getCurrentUser
├── auth.controller.ts       HTTP layer (handler() wrappers)
├── auth.routes.ts           /api/auth router + rate limiters
└── auth.seed.ts             seedAdmin() (used by seed scripts and tests)
src/middleware/auth.ts       requireAuth, requireRole, currentUser
src/types/express.d.ts       adds req.auth to Express's Request type
src/scripts/seed-admin.ts    npm run seed:admin
```

## Contracts
| Method | Path | Auth | Body | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | public | `{ email, password }` | 200 `{ data: { user } }` + sets `dt_access`, `dt_refresh` | 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS`, 429 `RATE_LIMITED` |
| POST | `/api/auth/refresh` | `dt_refresh` cookie | — | 200 `{ data: { user } }` + rotated cookies | 401 `SESSION_EXPIRED` / `SESSION_REVOKED` (cookies cleared) |
| POST | `/api/auth/logout` | cookie optional | — | 204 + cleared cookies | — |
| GET | `/api/auth/me` | `dt_access` | — | 200 `{ data: { user } }` | 401 `UNAUTHENTICATED` / `TOKEN_EXPIRED` |

`user` = `{ id, name, email, role }`; it never includes the hash.

**For the frontend:** any 401 from a protected endpoint → call `/api/auth/refresh` once → retry. If the refresh returns 401 → go to `/login`.

## Token design
- **Access token:** JWT HS256, `sub` = userId, `role`, `iss: doctor-tracker-api`, `aud: doctor-tracker-web`, TTL `ACCESS_TOKEN_TTL_SECONDS` (900). Verified statelessly, so no DB hit per request. Trade-off: a revoked session's access token stays valid for up to 15 minutes.
- **Refresh token:** 48 random bytes (base64url). Only its SHA-256 hash is stored. TTL `REFRESH_TOKEN_TTL_DAYS` (7).
- **Rotation:** `findOneAndUpdate({ tokenHash, rotatedAt: null, revokedAt: null, expiresAt > now }, { rotatedAt: now })` claims the token atomically, then a new token is issued in the same `family`.
- **Reuse detection:** a token that was rotated **more than 10 s ago** comes back → the whole family is revoked → 401 `SESSION_REVOKED`. Both the attacker and the real user must sign in again.
- **Grace window:** a token rotated **within 10 s** is treated as a parallel request from the same browser and gets a fresh pair. Trade-off: a stolen token replayed within those 10 s would also work.
- **Logout** revokes the whole family (including tokens issued in the grace window).
- Expired records are removed by MongoDB's TTL index on `expiresAt`.

## Cookies
`dt_access` and `dt_refresh`: `HttpOnly; SameSite=Lax; Path=/` (+ `Secure` in production). `Path=/` is required because the Next.js proxy needs the refresh cookie on page navigations.
CSRF: `SameSite=Lax` means browsers don't send these cookies on cross-site POST / PATCH / DELETE, and every state-changing endpoint is a non-GET method.

## Changes from the original plan
- `req.auth` (claims from the token) instead of `req.user`, to avoid confusion with a user document. `currentUser(req)` gives typed access without `!`.
- Auth responses follow the global `{ data: ... }` envelope.
- No `replacedByHash` field: the atomic claim + `family` covers rotation and revocation.
- `password.ts` split out of the service; `seed:admin` script added.

## Security notes
- One generic `INVALID_CREDENTIALS` message, and an equal-time bcrypt compare for unknown emails.
- Login limiter counts only failed attempts (10 / 15 min per IP); while limited, even the correct password gets 429.
- bcrypt cost 12 (≈ 0.32 s with bcryptjs on this machine).
