# Module 1.2 — Auth API: Context

## Contracts
| Method | Path | Auth | Body | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | public | `{ email, password }` | 200 `{ user }` + sets `dt_access`, `dt_refresh` | 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS`, 429 |
| POST | `/api/auth/refresh` | `dt_refresh` cookie | — | 200 `{ user }` + rotated cookies | 401 `SESSION_EXPIRED` / `SESSION_REVOKED` |
| POST | `/api/auth/logout` | cookie (optional) | — | 204 + cleared cookies | — |
| GET | `/api/auth/me` | `dt_access` | — | 200 `{ user }` | 401 `UNAUTHENTICATED` |

`user` = `{ id, name, email, role }`; it never includes the hash.

## Token design
- **Access token:** JWT HS256, `sub` = userId, `role`, `iss: doctor-tracker-api`, `aud: doctor-tracker-web`, TTL 15 min (env-configurable; set it short when testing refresh).
- **Refresh token:** opaque random string; only its SHA-256 hash is stored. Each refresh marks the old record `rotatedAt` + `replacedByHash` and issues a new one in the same `family`.
- **Reuse detection:** presenting a token that was rotated **more than 10 s ago**, or one that is revoked → revoke every token in that family → 401 `SESSION_REVOKED`.
- **Grace window (implementation note):** `proxy.ts` and the browser can race to refresh with the same token (parallel navigations/prefetches). A re-presented token rotated **within the last 10 s** is treated as a benign race: a new pair is issued for the family instead of revoking it. Without this, normal use would randomly log the user out.
- Expired refresh records are purged automatically by the TTL index on `expiresAt`.

## Cookies
`dt_access` and `dt_refresh` both use `path=/`. The refresh cookie must reach page navigations so `proxy.ts` can refresh before Server Components fetch.

## Security notes
- One generic `INVALID_CREDENTIALS` message for both unknown email and wrong password.
- Login rate limit keyed by IP; responses carry `RateLimit-*` headers.
- Passwords hashed with bcryptjs, cost 12.
