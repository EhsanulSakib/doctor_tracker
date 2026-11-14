# Milestone 1 — Backend Foundation: Context

## Goal
A running, hardened Express 5 + TypeScript API with MongoDB connectivity and the complete auth flow (login, rotating refresh, logout, me), verified by curl and a Supertest suite.

## Relevant decisions
#1 repo layout · #2 auth · #11 API security · #14 testing

## Backend folder structure (target)
```
backend/
├── src/
│   ├── app.ts                # express app factory (imported by tests)
│   ├── server.ts             # db connect + listen + graceful shutdown
│   ├── routes.ts             # mounts module routers under /api
│   ├── config/      env.ts (Zod-validated), db.ts
│   ├── lib/         logger.ts, http-error.ts, pagination.ts, search-key.ts, ttl-cache.ts
│   ├── middleware/  validate.ts, auth.ts, error-handler.ts, not-found.ts, rate-limit.ts
│   ├── constants/   enums.ts
│   ├── modules/
│   │   ├── auth/       user.model.ts, refresh-token.model.ts, tokens.ts, cookies.ts, auth.{schema,service,controller,routes}.ts
│   │   ├── doctors/    (milestone 2)
│   │   ├── patients/   (milestone 2)
│   │   └── dashboard/  (milestone 2)
│   └── scripts/     seed.ts
└── tests/
```

## Dependencies / versions (checked 2026-11-14)
express 5.3 · mongoose 9.12 · zod 4.6 · helmet 8.3 · express-rate-limit 8.7 · pino 10 / pino-http 11 · jsonwebtoken 9 · bcryptjs 3 (pure JS, no native build on Windows/Render) · cookie-parser · cors · vitest 5 · supertest 7 · mongodb-memory-server 11 · tsx (dev) · typescript (pin to a stable 5.x if 7.x tooling causes issues).

## Assumptions / notes
- **Express 5** forwards rejected promises from async handlers to the error handler, so no `asyncHandler` wrapper is needed.
- **Express 5 `req.query` is a read-only getter.** Validated data is passed to handlers through the typed `handler()` wrapper (`lib/handler.ts`) and never assigned back to `req.query`.
- **`express-mongo-sanitize` is incompatible with Express 5** (it reassigns `req.query`), and Mongoose's global `sanitizeFilter` would also neutralize the service's own operators. Injection protection = Express 5 simple query parser + strict Zod schemas (primitives / enums only) + Zod stripping unknown keys.
- **Local database:** MongoDB Atlas (user's choice for development and verification). Tests use mongodb-memory-server.
- Backend port **8082** (user preference; 4000 is used by another local project).
- Local port 27017 is already in use on this machine. Check what it is before choosing the docker-compose host port.
