# Module 1.1 — Project Scaffold: Tasks

- [x] [config] `git init` (branch `main`), root `.gitignore` (node_modules, .env, .next, dist, coverage), root `README.md` stub
- [x] [config] `docker-compose.yml`: MongoDB 8 with a named volume, host port overridable via `MONGO_PORT`
- [x] [config] `backend/package.json` scripts: `dev` (tsx watch), `build` (tsc), `start`, `typecheck`, `test`; `tsconfig.json` (strict, NodeNext, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`) + `tsconfig.build.json`
- [x] [backend] `config/env.ts`: Zod-validated env (NODE_ENV, PORT, MONGODB_URI, FRONTEND_URL, JWT_ACCESS_SECRET, ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_DAYS, TRUST_PROXY, ADMIN_*, LOG_LEVEL); loads `.env` via Node's built-in `process.loadEnvFile`; exits with a readable message on invalid env
- [x] [backend] `lib/logger.ts`: pino (pretty locally, JSON in prod), redacts cookies / auth / set-cookie / passwords; `pino-http` request logging with health checks ignored
- [x] [backend] `lib/http-error.ts` + `middleware/error-handler.ts` + `middleware/not-found.ts`: ZodError → 400, bad JSON → 400, body too large → 413, CastError → 400, Mongoose validation → 400, duplicate key → 409, everything else → generic 500 (logged, never leaked)
- [x] [backend] `lib/handler.ts`: typed `handler({ body, query, params }, fn)` wrapper that validates with Zod and passes parsed values (replaces the planned `req.valid` middleware; see context)
- [x] [backend] Security setup in `app.ts`: helmet, CORS (origin = FRONTEND_URL, credentials), `express.json({ limit: '10kb' })`, cookie-parser, `trust proxy` from env, simple query parser, global rate limiter (600 / 15 min), `strictQuery`
- [x] [backend] `config/db.ts` + `server.ts`: connect, listen, graceful shutdown on SIGINT/SIGTERM
- [x] [backend] `GET /api/health` → 200 `{ status: 'ok', db: 'up', uptime }` or 503 when the DB is down
- [x] [config] `backend/.env.example` + local `backend/.env` (random JWT secret)
- [x] [test] Vitest config + `tests/setup.ts` (mongodb-memory-server) + 6 tests: health, 404 shape, malformed JSON, 413, security headers, CORS allowlist
- [x] [test] Manual: `npm run dev` against MongoDB Atlas, curl health / unknown route / malformed JSON / 413 / headers / CORS / bad env / busy port
- [x] [backend] Fix found during verification: Express 5 passes `listen` errors to the callback, so the server logged "listening" while the port was taken. Now logs FATAL and exits 1
