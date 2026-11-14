# Module 1.2 — Auth API: Walkthrough

> A guide to every file this module created or changed, the security ideas behind it, and how it was verified.
> Status: **done** (2026-11-14) · 16 new automated tests (22 total) + 9 manual checks on Atlas.

## What this module built

Secure login for the admin portal:
- **Login** with email and password; sets two **httpOnly cookies**.
- **Access token** (`dt_access`): a short-lived JWT (15 min) the API checks on every request.
- **Refresh token** (`dt_refresh`): a long-lived random string (7 days) used only to get new tokens.
- **Rotation:** every refresh replaces the refresh token, and reusing an old one ends the whole session (stolen-token protection).
- **Logout** ends the session on the server too.
- **Route guards** (`requireAuth`, `requireRole`) for all future endpoints.
- A **seed script** for the admin account, and **brute-force protection** on login.

## Files

### Created
```
backend/src/
├── modules/auth/
│   ├── user.model.ts            User schema + toPublicUser()
│   ├── refresh-token.model.ts   RefreshToken schema (auto-expiring)
│   ├── tokens.ts                JWT sign/verify, refresh token generate/hash
│   ├── cookies.ts               cookie names + set/clear helpers
│   ├── password.ts              bcrypt hashing with timing-safe compare
│   ├── auth.schema.ts           Zod schema for the login body
│   ├── auth.service.ts          the logic: login / refresh / logout / current user
│   ├── auth.controller.ts       HTTP layer: reads cookies, sets cookies, sends JSON
│   ├── auth.routes.ts           /api/auth routes + rate limiters
│   └── auth.seed.ts             seedAdmin(): create or reset the admin account
├── middleware/auth.ts           requireAuth, requireRole, currentUser
├── types/express.d.ts           adds `req.auth` to Express's Request type
└── scripts/seed-admin.ts        `npm run seed:admin`
backend/tests/
├── helpers.ts                   cookie parser + loginAsAdmin() (reused by later modules)
└── auth.test.ts                 16 auth tests
```

### Changed
| File | Change |
|---|---|
| `src/routes.ts` | mounts `authRouter` at `/api/auth` |
| `package.json` | adds the `seed:admin` script |
| `src/config/db.ts` | intentional disconnects no longer log a misleading warning |

## How the layers fit together
```
auth.routes.ts      URL + method + rate limiter + guard        (which endpoint?)
      │
auth.controller.ts  cookies in/out, JSON response               (HTTP details)
      │
auth.service.ts     business rules, no Express objects          (what happens?)
      │
models / tokens.ts / password.ts                                (data + crypto)
```
The service never touches `req`/`res`. It takes plain values and returns plain values or throws `HttpError`, which keeps it easy to read and test. The same layering is used for doctors and patients.

## Suggested reading order
1. `user.model.ts`, `refresh-token.model.ts`: what is stored
2. `tokens.ts`, `password.ts`: the crypto building blocks
3. `cookies.ts`: how tokens reach the browser
4. `auth.service.ts`: **the core** (read `refresh()` slowly)
5. `auth.controller.ts`, `auth.routes.ts`: the HTTP layer
6. `middleware/auth.ts`: how other routes get protected
7. `tests/auth.test.ts`: each test is a readable spec of one rule

---

## The flows

### Login
```
Browser                          API                                   MongoDB
  │ POST /api/auth/login           │                                       │
  │ { email, password } ─────────► │ Zod: valid email? password present?   │
  │                                │ findOne({ email }) ─────────────────► │
  │                                │ bcrypt.compare (dummy hash if no user)│
  │                                │ create RefreshToken { hash, family }─►│
  │ ◄──── 200 { data: { user } }   │                                       │
  │       Set-Cookie: dt_access=<JWT, 15 min>                              │
  │       Set-Cookie: dt_refresh=<random, 7 days>                          │
```

### Authenticated request
```
Browser ── cookie dt_access ──► requireAuth: verify JWT signature + expiry (no DB call)
                                   ├─ ok      → req.auth = { userId, role } → handler
                                   ├─ expired → 401 TOKEN_EXPIRED   (client should refresh)
                                   └─ missing/invalid → 401 UNAUTHENTICATED
```

### Refresh with rotation and reuse detection
```
POST /api/auth/refresh (cookie dt_refresh = T1)
  │
  ├─ Atomically claim T1: findOneAndUpdate({ hash(T1), rotatedAt: null, revokedAt: null, not expired },
  │                                         { rotatedAt: now })
  │     claimed?  ── yes ──► issue T2 in the same family ──► 200 + new cookies
  │        │
  │        no ──► look T1 up
  │                 ├─ unknown / expired ──────────────► 401 SESSION_EXPIRED
  │                 ├─ revoked ────────────────────────► 401 SESSION_REVOKED
  │                 ├─ rotated ≤ 10 s ago (race) ──────► issue a new pair ──► 200
  │                 └─ rotated > 10 s ago (THEFT?) ────► revoke the whole family ──► 401 SESSION_REVOKED
```

---

## File by file

### `modules/auth/user.model.ts`
- Fields: `name`, `email` (**unique** index, lowercased, trimmed), `passwordHash`, `role` (`'admin'`), timestamps.
- `passwordHash` has `select: false`: **it's excluded from every query unless explicitly requested** (`.select('+passwordHash')`, used only by login). It can't leak by accident.
- `toPublicUser()` converts a DB document into the safe API shape `{ id, name, email, role }`.
- `USER_ROLES` is a `const` array; the `UserRole` type is derived from it, so adding a role later is a one-line change.

### `modules/auth/refresh-token.model.ts`
One document per issued refresh token:

| Field | Purpose |
|---|---|
| `userId` | owner |
| `family` | a random id shared by every token from one login, so one session can be revoked at once |
| `tokenHash` | **SHA-256 of the token, never the token itself** (unique index) |
| `expiresAt` | 7 days out; a **TTL index** (`expireAfterSeconds: 0`) makes MongoDB delete expired docs automatically |
| `rotatedAt` | set when this token was exchanged for a new one |
| `revokedAt` | set on logout or theft detection |

**Why hash refresh tokens?** If the database leaked, attackers would get only hashes, which can't be used as cookies. It's the same idea as password hashing, but SHA-256 is enough here because the token is 384 random bits (it can't be guessed or brute-forced).

### `modules/auth/tokens.ts`
- `signAccessToken({ userId, role })`: JWT signed with HS256, plus `sub`, `iss` (`doctor-tracker-api`), `aud` (`doctor-tracker-web`) and `exp` (`ACCESS_TOKEN_TTL_SECONDS`).
- `verifyAccessToken(token)`: checks the signature, expiry, issuer and audience, **allows only HS256** (blocks "algorithm confusion" attacks), then checks the payload shape (`sub` is a string, `role` is a known role).
- `generateRefreshToken()`: `crypto.randomBytes(48)` as base64url.
- `hashToken()`: SHA-256 hex.

**Why two kinds of token?** The JWT can be checked without a DB call (fast, on every request) but can't be revoked before it expires, so it's kept short (15 min). The refresh token is checked against the DB (revocable) but only used every 15 minutes.

### `modules/auth/cookies.ts`
| Attribute | Why |
|---|---|
| `HttpOnly` | JavaScript on the page can't read the cookie, so an XSS bug can't steal tokens (unlike localStorage) |
| `SameSite=Lax` | Browsers don't send the cookie on cross-site POST / PATCH / DELETE, which is CSRF protection |
| `Secure` (production) | HTTPS only |
| `Path=/` | Sent with every request, including page navigations, so the Next.js proxy can refresh before rendering |
| `Max-Age` | 900 s for access, 7 days for refresh |

`clearAuthCookies()` uses the same options; a cookie only clears if path and flags match.

### `modules/auth/password.ts`
- `hashPassword()`: bcrypt with cost **12** (≈ 0.32 s per hash with bcryptjs here). It's deliberately slow, so guessing passwords from a leaked hash is expensive.
- `verifyPassword(password, hash | undefined)`: **if the user doesn't exist, it still runs a bcrypt compare against a dummy hash.** Otherwise "unknown email" would answer instantly and "wrong password" after 0.3 s, and an attacker could time responses to find registered emails. The dummy hash is created once, lazily.
- `bcryptjs` (pure JS) instead of `bcrypt` (native): no compile step on Windows or Render.

### `modules/auth/auth.schema.ts`
```ts
email: z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email address')),
password: z.string().min(1).max(128),
```
`trim` + `toLowerCase` run **before** the email check (that's what `.pipe` does), so `"  ADMIN@x.dev "` works. `max(128)` stops someone sending a 10 MB "password" to make bcrypt work hard. An object such as `{ "$gt": "" }` fails `z.string()`, so it's a 400 and never reaches MongoDB.

### `modules/auth/auth.service.ts`: the core
- `login(email, password)`: find the user (with hash), verify, and on any failure throw the **same** `INVALID_CREDENTIALS` error (never reveal which part was wrong); otherwise `issueSession()`.
- `issueSession(user, family?)`: creates a refresh token record and returns `{ user, accessToken, refreshToken }`. A new login gets a new `family`; a refresh keeps the old one.
- `refresh(rawToken)`: see the diagram above. Key ideas:
  - **Atomic claim.** `findOneAndUpdate` with `rotatedAt: null` in the filter means only **one** request can rotate a token, even if two arrive at the same instant. No race condition.
  - **10-second grace window.** A page navigation and a prefetch can both refresh with the same token. Without the grace window the second would look like theft and log the user out. Trade-off: a token stolen and replayed within those 10 s would also work.
  - **Reuse after the window** means the token was probably copied, so `revokeFamily()` kills every token in that session. The attacker and the real user both have to log in again, and the real user notices.
- `logout(rawToken)`: revokes the whole family (including any tokens issued during the grace window).
- `getCurrentUser(userId)`: for `/me`; 401 if the account was deleted.

### `modules/auth/auth.controller.ts`
Thin HTTP layer built with the `handler()` wrapper from 1.1:
- `login`: validates the body, calls the service, sets cookies, returns `{ data: { user } }`.
- `refresh`: on **failure it clears the cookies before rethrowing**, so the browser doesn't keep a dead token.
- `logout`: revokes, clears cookies, 204.
- `me`: `currentUser(req)` → service → `{ data: { user } }`.

### `modules/auth/auth.routes.ts`
```ts
authRouter.post('/login',   loginLimiter,   auth.login);
authRouter.post('/refresh', refreshLimiter, auth.refresh);
authRouter.post('/logout',                  auth.logout);
authRouter.get ('/me',      requireAuth,    auth.me);
```
State-changing actions are POST (never GET), which is part of the CSRF protection.

### `modules/auth/auth.seed.ts`
`seedAdmin({ name, email, password })` does an upsert (`findOneAndUpdate` with `upsert: true`): it creates the admin, or **resets the name and password** if the admin exists. Running it twice is safe (idempotent), and the credentials in `.env` always work after seeding.

### `scripts/seed-admin.ts`
`npm run seed:admin`: connects, makes sure indexes exist (`syncIndexes`), calls `seedAdmin()` with `ADMIN_*` from `.env`, disconnects. Refuses to run without `ADMIN_PASSWORD`.

### `middleware/auth.ts`
- `requireAuth`: reads `dt_access`, verifies it, sets `req.auth = { userId, role }`. An expired token gets its own code (`TOKEN_EXPIRED`) so the frontend knows to refresh rather than log out.
- `requireRole(...roles)`: 403 if the role doesn't match. Used as `router.use(requireAuth, requireRole('admin'))` in the next modules.
- `currentUser(req)`: typed access to `req.auth` inside handlers (throws 401 if missing), so there's no `req.auth!`.

### `types/express.d.ts`
TypeScript "module augmentation": it tells TypeScript that Express's `Request` has an optional `auth` property, so `req.auth` is typed everywhere.

---

## Tests (`tests/auth.test.ts`, 16 tests)
| Group | What's proven |
|---|---|
| login | cookies are HttpOnly + SameSite=Lax + Path=/ · email is case/space-insensitive · wrong password and unknown email give the **identical** error and no cookies · invalid input gives field-level details · `{ "$gt": "" }` injection is rejected |
| me | works with a cookie · 401 without · tampered or forged token rejected · expired token gives `TOKEN_EXPIRED` |
| refresh | rotates both tokens and marks the old one used · two parallel refreshes with the same token both succeed (grace window) · reuse after the window revokes the **whole** session, including the newer token · missing/unknown token → `SESSION_EXPIRED` + cookies cleared |
| logout | 204 + cookies cleared + the token no longer refreshes · works without a session |
| seedAdmin | idempotent, and resets the password |

`tests/helpers.ts` provides `cookiesFrom(res)` (parses Set-Cookie headers) and `loginAsAdmin(app)`, which returns a ready Cookie header. The doctors and patients tests reuse it.

## Verification (manual, Atlas, port 8082)
| # | Check | Result |
|---|---|---|
| 1 | `/me` without cookie | 401 `UNAUTHENTICATED` |
| 2 | wrong password | 401 `INVALID_CREDENTIALS` |
| 3 | login | 200 + two HttpOnly / Lax cookies |
| 4 | `/me` with cookie | 200, admin user |
| 5 | refresh | 200, refresh token value changed |
| 6 | logout | 204, cookies expired |
| 7 | refresh with logged-out token | 401 `SESSION_REVOKED` |
| 8 | operator injection | 400 `VALIDATION_ERROR` |
| 9 | brute force | 429 after 10 failures, even with the correct password |

Performance: login ≈ 0.52 s steady state (bcrypt ≈ 0.32 s + 2 Atlas round trips); health ≈ 2 ms.

## Checkpoint summary (as reported)
- Login sets two httpOnly cookies (15-min access, 7-day refresh).
- Refresh tokens rotate on every use; the claim is atomic so parallel requests can't double-rotate.
- Reuse of an old token after 10 s ends the whole session; within 10 s it's treated as parallel tabs.
- Logout ends the session server-side; 10 failed logins in 15 min trigger a 429.
- `requireAuth` / `requireRole('admin')` are ready for the doctor and patient routes.
- Small fix: intentional DB disconnects no longer log a misleading warning.
- 22/22 tests pass, type check clean, manual flow verified on Atlas, admin seeded (`admin@doctortracker.dev`).
