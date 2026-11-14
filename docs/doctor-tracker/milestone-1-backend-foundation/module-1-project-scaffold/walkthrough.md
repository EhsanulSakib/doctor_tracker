# Module 1.1 — Project Scaffold: Walkthrough

> A guide to every file this module created, what's inside, and why it's built that way.
> Status: **done** (2026-11-14) · 6 automated tests + 8 manual checks passed.

## What this module built

A running Express 5 + TypeScript API with no features yet. It has everything every feature will need: validated configuration, a database connection, security middleware, one consistent error format, logging, input validation, and a test setup.

```
Doctor Tracker/
├── .gitignore
├── docker-compose.yml
├── README.md                          (placeholder until module 5.1)
└── backend/
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.build.json
    ├── vitest.config.ts
    ├── .env.example
    ├── .env                           (git-ignored, your real secrets)
    ├── src/
    │   ├── server.ts                  entry point
    │   ├── app.ts                     Express app + middleware chain
    │   ├── routes.ts                  /api router
    │   ├── config/
    │   │   ├── env.ts                 validated environment variables
    │   │   └── db.ts                  MongoDB connection
    │   ├── lib/
    │   │   ├── logger.ts              pino logger
    │   │   ├── http-error.ts          HttpError class
    │   │   └── handler.ts             Zod validation wrapper for routes
    │   └── middleware/
    │       ├── error-handler.ts       turns any error into the standard JSON shape
    │       ├── not-found.ts           404 for unknown routes
    │       └── rate-limit.ts          request limiters
    └── tests/
        ├── setup.ts                   in-memory MongoDB for tests
        └── app.test.ts                6 foundation tests
```

## How a request flows

```
server.ts ── connectDb() ──► MongoDB Atlas
    │
    └─ app.listen(8082)
          │
          ▼
app.ts:   helmet ─► cors ─► pino-http ─► express.json (10kb) ─► cookie-parser
          │
          ▼
routes.ts: /api/health ─► apiLimiter ─► (feature routers: /auth, /doctors, …)
          │
          ▼  nothing matched / something threw
not-found.ts ─► error-handler.ts ─► { "error": { "code", "message", "details?" } }
```

## Suggested reading order
1. `config/env.ts`: how configuration is loaded and validated
2. `server.ts`: startup and shutdown
3. `app.ts`: the middleware chain (security first)
4. `routes.ts`: where features plug in
5. `lib/http-error.ts` → `middleware/error-handler.ts`: how errors become responses
6. `lib/handler.ts`: how every route validates its input
7. `middleware/rate-limit.ts`, `lib/logger.ts`, `config/db.ts`
8. `tests/setup.ts` → `tests/app.test.ts`

---

## Root files

### `.gitignore`
Keeps `node_modules`, build output (`dist`, `.next`), coverage and **all `.env` files** out of git. `!.env.example` re-includes the template, since the spec requires it.

### `docker-compose.yml`
Optional local MongoDB 8 for reviewers who don't use Atlas: `docker compose up -d`. The host port is `${MONGO_PORT:-27017}`, so it can be changed if 27017 is taken. Data lives in a named volume (`mongo-data`) and survives restarts. A health check pings the database.

### `README.md`
Placeholder. The full README (setup, architecture, technical decisions, screenshots) is written in module 5.1.

---

## Backend config files

### `backend/package.json`
- `"type": "module"`: the backend uses native ES modules. That's why imports end in `.js` even in `.ts` files (`import { env } from './config/env.js'`), because Node resolves the compiled file.
- Scripts:

| Script | What it runs |
|---|---|
| `npm run dev` | `tsx watch src/server.ts`: runs TypeScript directly and restarts on save |
| `npm run build` | `tsc -p tsconfig.build.json`: compiles to `dist/` |
| `npm start` | `node dist/server.js`: production |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | `vitest run` |

### `backend/tsconfig.json`
Strict TypeScript. Notable flags:
- `noUncheckedIndexedAccess`: `obj[key]` is typed `T | undefined`, which forces you to handle missing values.
- `verbatimModuleSyntax`: type-only imports must use `import type`, so they're removed from the compiled output.
- `module/moduleResolution: NodeNext`: matches how Node itself resolves ES modules.

### `backend/tsconfig.build.json`
Extends the main config, but compiles only `src/` (no tests, no scripts) into `dist/`.

### `backend/vitest.config.ts`
Test runner config. Its `test.env` block sets **fake** environment values before any app code loads, so tests never use real secrets or Atlas. `hookTimeout` is long because the first run downloads a MongoDB binary.

### `backend/.env.example`
Every environment variable with a comment and a safe placeholder. Copy it to `.env` and fill it in. Includes the one-liner that generates a JWT secret.

---

## Source files

### `src/config/env.ts`: configuration you can trust
```ts
if (process.env.NODE_ENV !== 'test' && existsSync('.env')) process.loadEnvFile('.env');

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8082),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, '…at least 32 characters'),
  …
});
```
- Uses Node's built-in `process.loadEnvFile`, so there's no `dotenv` dependency.
- Every variable is checked with Zod: types are converted (`"8082"` → `8082`), defaults applied, rules enforced.
- If anything is wrong, the process **exits immediately with a readable message** instead of crashing later with a confusing error. This is "fail fast".
- Exports a typed `env` object plus `isProd` / `isTest`, so the rest of the code never touches `process.env` directly.

### `src/config/db.ts`: MongoDB connection
- `connectDb()` connects with a 10 s server-selection timeout and logs unexpected disconnects and reconnects.
- `disconnectDb()` is used for graceful shutdown and scripts. It sets a `closing` flag so an intentional disconnect doesn't log a warning (fixed in module 1.2).
- `isDbConnected()` is used by the health check.
- `mongoose.set('strictQuery', true)`: filter keys that aren't in the schema are ignored instead of sent to MongoDB.

### `src/server.ts`: entry point
1. Connect to MongoDB **first**, so the API never accepts requests it can't serve.
2. `app.listen(env.PORT, (err) => …)`. **In Express 5, listen errors such as a busy port arrive as the callback's `err` argument**; they are not thrown. We log `FATAL` and exit 1 (this bug was found during verification).
3. On `SIGINT`/`SIGTERM` (Ctrl+C, or the host stopping the app): stop accepting connections, close the database, exit. If that takes more than 10 s, force-exit.

### `src/app.ts`: the Express app
`createApp()` builds the app **without** listening, so tests can use it directly with Supertest. The middleware order matters:

| Order | Middleware | Why |
|---|---|---|
| 1 | `helmet()` | Security headers (CSP, nosniff, frame protection…) |
| 2 | `cors({ origin: FRONTEND_URL, credentials: true })` | Only the frontend may call the API from a browser, cookies included |
| 3 | `pinoHttp` | One log line per request (health checks skipped) |
| 4 | `express.json({ limit: '10kb' })` | Parses JSON; rejects huge bodies (a cheap DoS defense) |
| 5 | `cookieParser()` | Makes `req.cookies` available (auth uses it) |
| 6 | `/api` → `apiRouter` | The routes |
| 7 | `notFound`, `errorHandler` | Always last |

Also:
- `app.set('query parser', 'simple')`: with this parser `?status[$ne]=x` stays a plain string key and can never become a MongoDB operator object. It's Express 5's default; set explicitly to document the intent.
- `trust proxy` comes from env, so rate limiting sees the real client IP behind Render or Vercel.
- `x-powered-by` is disabled (don't advertise the framework).

### `src/routes.ts`: the API router
- `GET /api/health` → `200 { status: 'ok', db: 'up', uptime }` or `503` if the DB is down. It sits **before** the rate limiter so uptime monitors never get throttled.
- `apiRouter.use(apiLimiter)` applies to everything after it.
- Feature routers are mounted here (`/auth` was added in 1.2).

### `src/lib/logger.ts`: logging
- pino: very fast, structured JSON logs.
- Locally, `pino-pretty` makes them readable and coloured; in production they're plain JSON (what log platforms expect).
- `redact` removes cookies, auth headers, Set-Cookie and passwords from logs. **Secrets never reach log files.**

### `src/lib/http-error.ts`: errors meant for the client
```ts
throw HttpError.notFound('Doctor');                                         // 404 NOT_FOUND "Doctor not found"
throw HttpError.conflict('Doctor still has patients', 'DOCTOR_HAS_PATIENTS'); // 409
```
Rule: **only `HttpError` messages reach the client.** Any other error becomes a generic 500, so internal details never leak.

### `src/lib/handler.ts`: typed validation for every route
```ts
export const list = handler({ query: listDoctorsSchema }, async ({ query }, req, res) => {
  // `query` is fully typed, already converted ("10" → 10) and defaulted
});
```
- Parses `body`, `query` and `params` with Zod **before** your code runs. Invalid input throws a `ZodError`, which becomes a 400.
- Zod object schemas drop unknown keys, so a payload like `{ "$gt": "" }` never reaches a query.
- Why a wrapper instead of a `validate()` middleware: Express 5's `req.query` is read-only, and storing parsed data on `req` loses the types. The wrapper passes typed values straight to the handler, with no casts.
- Express 5 automatically forwards rejected promises to the error handler, so there's no `try/catch` or `asyncHandler`.

### `src/middleware/error-handler.ts`: one error format for everything
Every error becomes `{ "error": { "code": "...", "message": "...", "details": ... } }`:

| Error | Status / code |
|---|---|
| `HttpError` | its own status and code |
| `ZodError` | 400 `VALIDATION_ERROR` + `details: [{ path, message }]` |
| Broken JSON | 400 `BAD_JSON` |
| Body over 10kb | 413 `PAYLOAD_TOO_LARGE` |
| Mongoose `CastError` (bad id) | 400 `INVALID_ID` |
| Mongoose `ValidationError` | 400 `VALIDATION_ERROR` |
| Duplicate key (code 11000) | 409 `CONFLICT` + `details.fields` |
| Anything else | 500 `INTERNAL` with a generic message (the real error is logged) |

The frontend can therefore handle errors the same way everywhere.

### `src/middleware/not-found.ts`
Unknown route → `404 NOT_FOUND "Route GET /api/x does not exist"`, in the same shape.

### `src/middleware/rate-limit.ts`
| Limiter | Limit (per IP, 15 min) | Used by |
|---|---|---|
| `apiLimiter` | 600 requests | every `/api` route except health |
| `loginLimiter` | 10 **failed** attempts (`skipSuccessfulRequests`) | `POST /api/auth/login` (1.2) |
| `refreshLimiter` | 60 | `POST /api/auth/refresh` (1.2) |

All return the standard 429 `RATE_LIMITED` error and send `RateLimit-*` headers. All are skipped in tests. The counts live in memory per instance; a multi-instance deployment would need a Redis store (noted for the README's scalability section).

---

## Tests

### `tests/setup.ts`
Runs for each test file: starts an **in-memory MongoDB** (mongodb-memory-server), connects Mongoose, empties every collection after each test, and stops it at the end. Tests are isolated and never touch Atlas.

### `tests/app.test.ts`: 6 tests
1. Health check → 200, `db: 'up'`
2. Unknown route → 404 in the standard shape
3. Malformed JSON → 400 `BAD_JSON`
4. 11kb body → 413 `PAYLOAD_TOO_LARGE`
5. Security headers present, no `X-Powered-By`
6. CORS allows `http://localhost:3000` only

---

## Decisions made while building (and why)
| Decision | Why |
|---|---|
| `handler()` wrapper instead of a `req.valid` middleware | Typed input without casts; works with Express 5's read-only `req.query` |
| No global Mongoose `sanitizeFilter` | It would also neutralize our own `$regex` / `$in` / `$gte` filters. Injection is blocked by the simple query parser + Zod |
| No `express-mongo-sanitize` | Incompatible with Express 5 (it reassigns `req.query`) |
| `ACCESS_TOKEN_TTL_SECONDS` as a number | Used for both the JWT expiry and the cookie maxAge, so no parsing |
| TypeScript 5.9.3, not 7.x | TS 7 (native compiler) was days old; 5.9 is what the tooling supports |
| Port 8082 | Your choice; 4000 is used by another project on this machine |

## Bug found during verification
**Silent startup failure on a busy port.** Port 4000 was taken by another local app. Our server printed "listening" anyway, because Express 5 passes `EADDRINUSE` to the `listen` callback instead of throwing, and the callback ignored it. Fixed: log `FATAL` and exit 1.

## Verification
- `tsc --noEmit` clean · `npm run build` clean · `vitest run` 6/6
- Manual curl against Atlas on port 8082: health, 404, bad JSON, 413, security headers, CORS, invalid env (exits with a message), busy port (exits with FATAL)

## Checkpoint summary (as reported)
- The API connects to MongoDB Atlas and runs on `http://localhost:8082`.
- Checked startup config, consistent JSON errors, Zod validation through `handler()`, helmet, a CORS allowlist, a 10kb body limit, rate limits, request logging with secrets hidden, and a clean shutdown.
- Bug fixed during the manual check: a busy port no longer fails silently.
- 6/6 automated tests, 8/8 manual checks, clean production build.
- Reminder: `backend/.env` holds the Atlas password and is git-ignored; rotate the password after the project, since it was shared in chat.
