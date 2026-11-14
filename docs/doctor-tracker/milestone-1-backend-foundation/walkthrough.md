# Milestone 1 — Backend Foundation: Walkthrough

> Index of every file produced in this milestone. Each module's `walkthrough.md` explains its files in detail.

| Module | Status | Detailed walkthrough |
|---|---|---|
| 1.1 Project scaffold | done | [module-1-project-scaffold/walkthrough.md](module-1-project-scaffold/walkthrough.md) |
| 1.2 Auth API | done | [module-2-auth-api/walkthrough.md](module-2-auth-api/walkthrough.md) |

## Result of this milestone
A hardened Express 5 + TypeScript API connected to MongoDB Atlas, with a complete cookie-based auth system (login, rotating refresh tokens with theft detection, logout, route guards). 22 automated tests; every endpoint checked by hand with curl.

## File tree after milestone 1
```
Doctor Tracker/
├── .gitignore                         1.1
├── docker-compose.yml                 1.1
├── README.md                          1.1 (placeholder)
└── backend/
    ├── package.json                   1.1 (+ seed:admin script in 1.2)
    ├── tsconfig.json                  1.1
    ├── tsconfig.build.json            1.1
    ├── vitest.config.ts               1.1
    ├── .env.example                   1.1
    ├── src/
    │   ├── server.ts                  1.1
    │   ├── app.ts                     1.1
    │   ├── routes.ts                  1.1 (+ /auth mounted in 1.2)
    │   ├── config/
    │   │   ├── env.ts                 1.1
    │   │   └── db.ts                  1.1 (shutdown log fix in 1.2)
    │   ├── lib/
    │   │   ├── logger.ts              1.1
    │   │   ├── http-error.ts          1.1
    │   │   └── handler.ts             1.1
    │   ├── middleware/
    │   │   ├── error-handler.ts       1.1
    │   │   ├── not-found.ts           1.1
    │   │   ├── rate-limit.ts          1.1
    │   │   └── auth.ts                1.2
    │   ├── modules/auth/              1.2 (10 files)
    │   ├── types/express.d.ts         1.2
    │   └── scripts/seed-admin.ts      1.2
    └── tests/
        ├── setup.ts                   1.1
        ├── app.test.ts                1.1
        ├── helpers.ts                 1.2
        └── auth.test.ts               1.2
```

## File index
| File | Module | One-line purpose |
|---|---|---|
| `.gitignore` | 1.1 | keep secrets, deps and builds out of git |
| `docker-compose.yml` | 1.1 | optional local MongoDB |
| `backend/package.json` | 1.1 · 1.2 | deps and scripts (`dev`, `build`, `start`, `test`, `seed:admin`) |
| `backend/tsconfig.json` / `tsconfig.build.json` | 1.1 | strict TS config / production build config |
| `backend/vitest.config.ts` | 1.1 | test runner config with fake env |
| `backend/.env.example` | 1.1 | documented env template |
| `src/server.ts` | 1.1 | entry point: connect DB → listen → graceful shutdown |
| `src/app.ts` | 1.1 | Express app and security middleware chain |
| `src/routes.ts` | 1.1 · 1.2 | `/api` router: health, rate limiter, feature routers |
| `src/config/env.ts` | 1.1 | load and validate env, fail fast |
| `src/config/db.ts` | 1.1 · 1.2 | MongoDB connect / disconnect / status |
| `src/lib/logger.ts` | 1.1 | pino logger with secret redaction |
| `src/lib/http-error.ts` | 1.1 | `HttpError`: the only errors whose message reaches clients |
| `src/lib/handler.ts` | 1.1 | Zod validation wrapper giving typed route input |
| `src/middleware/error-handler.ts` | 1.1 | every error → `{ error: { code, message, details } }` |
| `src/middleware/not-found.ts` | 1.1 | 404 for unknown routes |
| `src/middleware/rate-limit.ts` | 1.1 | global, login and refresh limiters |
| `src/middleware/auth.ts` | 1.2 | `requireAuth`, `requireRole`, `currentUser` |
| `src/modules/auth/user.model.ts` | 1.2 | User schema, hash hidden by default |
| `src/modules/auth/refresh-token.model.ts` | 1.2 | hashed refresh tokens, auto-expiring |
| `src/modules/auth/tokens.ts` | 1.2 | JWT sign/verify, refresh token generate/hash |
| `src/modules/auth/cookies.ts` | 1.2 | httpOnly / SameSite cookie helpers |
| `src/modules/auth/password.ts` | 1.2 | bcrypt with timing-safe compare |
| `src/modules/auth/auth.schema.ts` | 1.2 | login body validation |
| `src/modules/auth/auth.service.ts` | 1.2 | login / refresh (rotation + reuse detection) / logout |
| `src/modules/auth/auth.controller.ts` | 1.2 | HTTP layer for auth |
| `src/modules/auth/auth.routes.ts` | 1.2 | `/api/auth/*` routes |
| `src/modules/auth/auth.seed.ts` | 1.2 | idempotent admin upsert |
| `src/types/express.d.ts` | 1.2 | types `req.auth` |
| `src/scripts/seed-admin.ts` | 1.2 | `npm run seed:admin` |
| `tests/setup.ts` | 1.1 | in-memory MongoDB per test file |
| `tests/app.test.ts` | 1.1 | 6 foundation tests |
| `tests/helpers.ts` | 1.2 | cookie parsing, `loginAsAdmin()` |
| `tests/auth.test.ts` | 1.2 | 16 auth tests |

## Patterns introduced here (reused in every later module)
1. **Module folder per feature**: `modules/<feature>/` with `*.model.ts`, `*.schema.ts`, `*.service.ts`, `*.controller.ts`, `*.routes.ts`.
2. **Routes → controller → service → model** layering; services never touch `req`/`res`.
3. **`handler({ body, query, params }, fn)`** for every endpoint, giving validated and typed input.
4. **`HttpError`** for expected failures; everything else becomes a safe 500.
5. **`{ data: … }`** for success, **`{ error: { code, message, details } }`** for failure.
6. **Tests per module** with Supertest + in-memory MongoDB, plus manual curl checks recorded in the QA guide.
