# Module 1.2 — Auth API: Tasks

- [x] [backend] `user.model.ts`: name, email (unique, lowercase, trimmed), passwordHash (`select: false`), role (`admin`), timestamps; `toPublicUser()`
- [x] [backend] `refresh-token.model.ts`: userId, family, tokenHash (unique), expiresAt (TTL index), rotatedAt, revokedAt
- [x] [backend] `tokens.ts`: sign/verify access JWT (HS256, `iss`/`aud`, payload shape checked); opaque refresh token (`randomBytes(48)` base64url) + SHA-256 hash
- [x] [backend] `cookies.ts`: set/clear `dt_access` + `dt_refresh` (httpOnly, `SameSite=Lax`, `Secure` in prod, `path=/`)
- [x] [backend] `password.ts`: bcrypt hash/verify (cost 12), dummy-hash comparison for unknown emails
- [x] [backend] `auth.service.ts`: login, refresh (atomic claim + rotation + reuse detection + 10 s grace window), logout (revokes the session family), getCurrentUser
- [x] [backend] `auth.schema.ts` + `auth.controller.ts` + `auth.routes.ts`; login limiter (10 failed / 15 min), refresh limiter (60 / 15 min)
- [x] [backend] `middleware/auth.ts`: `requireAuth` (sets `req.auth`), `requireRole(...roles)`, `currentUser(req)`; `types/express.d.ts` augmentation
- [x] [backend] Admin seeding: `seedAdmin()` in `auth.seed.ts` (idempotent upsert) + `npm run seed:admin`
- [x] [test] Supertest (16 tests): login ok / case-insensitive email / same error for wrong password and unknown email / validation / operator injection; `me` ok / no token / tampered / expired (`TOKEN_EXPIRED`); refresh rotates / parallel refresh in grace window / reuse after grace revokes the family / missing + unknown token; logout ends the session / logout without session; seedAdmin idempotent
- [x] [test] Manual curl against Atlas: full flow + rate limit + latency check
- [x] [backend] Small fix found during verification: intentional `disconnectDb()` logged a misleading "MongoDB disconnected" warning; it now only warns on unexpected disconnects
