# Module 1.2 — Auth API: Tasks

- [ ] [backend] `user.model.ts`: name, email (unique, lowercase, trimmed), passwordHash (`select: false`), role (`admin`), timestamps
- [ ] [backend] `refresh-token.model.ts`: userId, family (uuid), tokenHash (unique), expiresAt (TTL index), revokedAt, rotatedAt, replacedByHash
- [ ] [backend] `tokens.ts`: sign/verify access JWT (HS256, `iss`/`aud`, short TTL); generate opaque refresh token (`crypto.randomBytes(48)` base64url) + SHA-256 hash
- [ ] [backend] `cookies.ts`: set/clear `dt_access` + `dt_refresh` (httpOnly, `SameSite=Lax`, `Secure` in prod, `path=/`, maxAge from TTLs)
- [ ] [backend] `auth.service.ts`: login (bcrypt compare; compare against a dummy hash when the user is missing to keep timing flat), refresh (rotation + reuse detection + grace window), logout (revoke current token), me
- [ ] [backend] `auth.schema.ts` + `auth.routes.ts` + controller; login limiter (10 / 15 min per IP), refresh limiter (60 / 15 min per IP)
- [ ] [backend] `middleware/auth.ts`: `requireAuth` (verify `dt_access`, attach `req.user`), `requireRole('admin')`
- [ ] [backend] Admin seeding: shared `seedAdmin()` used by the full seed in 2.3, runnable on its own via `npm run seed:admin`
- [ ] [test] Supertest: login ok / wrong password / unknown email / validation; `me` with and without cookie; refresh rotates both cookies; reusing an old refresh token (outside grace) revokes the family; logout clears cookies and revokes
- [ ] [test] Manual curl with a cookie jar; show output
