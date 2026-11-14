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
- On this machine (C: almost full), run tests with temp files on D:: `TEMP="$PWD/.tmp" TMP="$PWD/.tmp" npm test` from `backend/`

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

### 2.1 Doctors API
Setup: log in first with a cookie jar (§ 1.2 step 3), then add `-b $J` to every request.

| # | Scenario | Command | Expected |
|---|---|---|---|
| 1 | No session | `curl -i $B/api/doctors` | `401 UNAUTHENTICATED` |
| 2 | Create | `curl -b $J -X POST $B/api/doctors -H "Content-Type: application/json" -d '{"name":"Dr. Lena Okafor","specialization":"Neurology","hospital":"St. Mary Hospital","phone":"+1 (555) 123-4567","email":"lena.okafor@stmary.org","yearsOfExperience":14,"joinedAt":"2021-04-12"}'` | `201`, `status: "active"`, `patientCount: 0`, no `searchKey` |
| 3 | Duplicate email (other case) | same body with `"email":"LENA.OKAFOR@stmary.org"` | `409 CONFLICT`, `details.fields: ["email"]` |
| 4 | Validation | `{"name":"X","specialization":"Wizardry","phone":"abc","email":"no","yearsOfExperience":-2,"joinedAt":"2999-01-01"}` | `400`, one message per field (`Hospital is required`, `Cannot be negative`, `Date cannot be in the future`…) |
| 5 | Default list | `curl -b $J $B/api/doctors` | newest first, `meta { page, limit, total, totalPages }` |
| 6 | Search | `?search=oka` · `?search=1555987` · `?search=AISHA%20rah` | surname prefix, phone digits, multi-word (case-insensitive) |
| 7 | Filters | `?specialization=Cardiology` · `?status=on_leave` · `?hospital=City%20General` · `?joinedFrom=2021-01-01&joinedTo=2023-12-31` · `?expMin=10&expMax=25` | only matching doctors |
| 8 | Pagination | `?limit=2&page=2&sort=name` | `meta.page 2`, correct slice |
| 9 | Bad query | `?limit=500` | `400`, `limit: Too big: expected number to be <=50` |
| 10 | Hospitals | `$B/api/doctors/hospitals` | distinct names A→Z |
| 11 | Options | `$B/api/doctors/options?search=sam` | `[{ id, name, specialization }]` |
| 12 | Get by id | `$B/api/doctors/<id>` · unknown id · `not-an-id` | `200` · `404` · `400 Invalid id` |
| 13 | Update | `curl -b $J -X PATCH $B/api/doctors/<id> -d '{"name":"Dr. Lena Okafor-Mensah"}' -H "Content-Type: application/json"` | `200`; `?search=mensah` now finds her |
| 14 | Delete guard | delete a doctor who has a patient | `409 DOCTOR_HAS_PATIENTS`, `details.patientCount` |
| 15 | Delete | delete after removing the patients, then GET | `204`, then `404` |
| 16 | Index usage | `cd backend && npm run db:explain` | every line starts with `✓ index` (no `COLLSCAN`) |

**Result 2026-11-14:** all 16 passed against Atlas; `npm test` 44/44. Two demo doctors (Dr. Samir Haddad, Dr. Aisha Rahman) were left on Atlas; the 2.3 seed replaces them.

## Edge-case checklist (global)
- [x] Every protected endpoint returns 401 without a cookie (`/api/auth/me`, `/api/doctors/*`)
- [x] Invalid ObjectId in a path → 400, not 500
- [x] Unknown route → 404 with error shape
- [x] Malformed JSON body → 400 with error shape
- [x] `limit` > 50 is rejected/capped
- [x] Operator injection (`{"$gt": ""}`) in body/query is rejected (body → 400; `?status[$ne]=x` keys are ignored)
