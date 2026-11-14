# Doctor Tracker — QA Guide

> Updated after each module with scenarios, commands and expected output.

## Environment
| Item | Value |
|---|---|
| Backend URL (local) | `http://localhost:8082` |
| Frontend URL (local) | `http://localhost:3000` |
| MongoDB (dev) | MongoDB Atlas, URI in `backend/.env` (git-ignored). Reviewers can use `docker compose up -d` instead |
| MongoDB (tests) | mongodb-memory-server (in-memory, started per test file) |
| Admin login | from `backend/.env` → `ADMIN_EMAIL` / `ADMIN_PASSWORD` (seeded) |

## Conventions
- Cookie jar for curl: `-c jar.txt -b jar.txt`
- Error shape: `{ "error": { "code": "...", "message": "...", "details": ... } }`
- Automated tests: `cd backend && npm test` (first run downloads a MongoDB binary; set `MONGOMS_SYSTEM_BINARY` to reuse a local `mongod`)

## Scenarios by module

### 1.1 Project scaffold
Start the API: `cd backend && npm run dev` → log line `API listening on http://localhost:8082` after `MongoDB connected`.

| # | Scenario | Command | Expected |
|---|---|---|---|
| 1 | Health check | `curl -i http://localhost:8082/api/health` | `200` `{"status":"ok","db":"up","uptime":N}` |
| 2 | Unknown route | `curl -i http://localhost:8082/api/nope` | `404` `{"error":{"code":"NOT_FOUND","message":"Route GET /api/nope does not exist"}}` |
| 3 | Malformed JSON | `curl -i -X POST http://localhost:8082/api/x -H "Content-Type: application/json" -d '{"a":'` | `400` `BAD_JSON` |
| 4 | Body over 10kb | POST an 11kb JSON body | `413` `PAYLOAD_TOO_LARGE` |
| 5 | Security headers | `curl -I http://localhost:8082/api/health` | `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, no `X-Powered-By` |
| 6 | CORS | `curl -I -H "Origin: https://evil.example" http://localhost:8082/api/health` | no `Access-Control-Allow-Origin: https://evil.example` |
| 7 | Bad env | `JWT_ACCESS_SECRET=short npx tsx src/server.ts` | exit 1 with `Invalid environment configuration ✖ JWT_ACCESS_SECRET must be at least 32 characters` |
| 8 | Port already in use | start a second instance while the API runs | exit 1 with `FATAL: Could not listen on port 8082` (`EADDRINUSE`) |

**Result 2026-11-14:** all 8 scenarios passed against MongoDB Atlas; `npm test` 6/6; `npm run build` clean.

### 1.2 Auth API
Setup: `cd backend && npm run seed:admin` → `Admin account ready { email: "admin@doctortracker.dev" }`.
Use a cookie jar: `J=jar.txt`.

| # | Scenario | Command | Expected |
|---|---|---|---|
| 1 | `me` without cookie | `curl -i $B/api/auth/me` | `401 UNAUTHENTICATED` |
| 2 | Wrong password | `curl -i -X POST $B/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@doctortracker.dev","password":"wrong"}'` | `401 INVALID_CREDENTIALS`, no cookies |
| 3 | Login | same with the real password, plus `-c $J` | `200 { data: { user } }`; two `Set-Cookie` lines with `HttpOnly; SameSite=Lax; Path=/`, Max-Age 900 / 604800 |
| 4 | `me` with cookie | `curl -i -b $J $B/api/auth/me` | `200`, same user |
| 5 | Refresh | `curl -i -b $J -c $J -X POST $B/api/auth/refresh` | `200`; the `dt_refresh` value in the jar changes |
| 6 | Logout | `curl -i -b $J -c $J -X POST $B/api/auth/logout` | `204`; both cookies expired (`Expires=Thu, 01 Jan 1970`) |
| 7 | Reuse logged-out token | `curl -i -X POST $B/api/auth/refresh -H "Cookie: dt_refresh=<token from step 5>"` | `401 SESSION_REVOKED`, cookies cleared |
| 8 | Operator injection | login body `{"email":{"$gt":""},"password":{"$gt":""}}` | `400 VALIDATION_ERROR` |
| 9 | Brute force | 11 wrong-password logins in a row | `401` until 10 failures, then `429 RATE_LIMITED` (even with the correct password) for 15 min; restarting the API clears it |

Covered only by automated tests (hard to do by hand): expired access token → `TOKEN_EXPIRED`; reuse of a rotated token after the 10 s grace window revokes the whole session; two parallel refreshes with the same token both succeed.

**Result 2026-11-14:** all 9 scenarios passed against MongoDB Atlas; `npm test` 22/22. Login ≈ 0.52 s steady state.

## Edge-case checklist (global)
- [x] Every protected endpoint returns 401 without a cookie (`/api/auth/me` so far)
- [ ] Invalid ObjectId in a path → 400, not 500
- [x] Unknown route → 404 with error shape
- [x] Malformed JSON body → 400 with error shape
- [ ] `limit` > 50 is rejected/capped
- [ ] Operator injection (`{"$gt": ""}`) in body/query is rejected
