# Doctor Tracker — QA Guide

> Updated after each module with scenarios, commands and expected output.

## Environment
| Item | Value |
|---|---|
| Backend URL (local) | `http://localhost:8082` |
| Frontend URL (local) | `http://localhost:3000` |
| MongoDB (dev, working DB) | **local** MongoDB service, `MONGODB_URI=mongodb://127.0.0.1:27017/doctor_tracker` (since 2026-11-15). Reviewers can use `docker compose up -d` instead |
| MongoDB (shared copy) | MongoDB Atlas, `SYNC_TARGET_URI` in `backend/.env` (git-ignored). Kept identical to local with `npm run db:sync -- --yes` |
| MongoDB (tests) | mongodb-memory-server (in-memory, started per test file) |
| Admin login | from `backend/.env` → `ADMIN_EMAIL` / `ADMIN_PASSWORD` (seeded) |

### Database workflow
| Task | Command (from `backend/`) |
|---|---|
| Demo data (replaces doctors + patients, upserts the admin) | `npm run seed` |
| See what a sync would change | `npm run db:sync` (preview, writes nothing) |
| Push local → Atlas | `npm run db:sync -- --yes` |
| Pull Atlas → local | `npm run db:sync -- --pull --yes` |
| Run one command against Atlas instead of local | prefix it with `MONGODB_URI="$(grep '^SYNC_TARGET_URI=' .env \| cut -d= -f2-)"` (a shell variable wins over `.env`) |

Sync copies `users`, `doctors`, `patients` exactly (same `_id`s) and the schema indexes; refresh tokens are not copied (the destination's sessions are cleared).
**This network:** Node can't resolve `mongodb+srv://` addresses through the router (`querySrv EBADRESP`), so `SYNC_TARGET_URI` uses Atlas's standard `mongodb://host1,host2,host3` form. The original SRV string is kept as a comment in `.env` for Render.

## Conventions
- Cookie jar for curl: `-c jar.txt -b jar.txt`
- Error shape: `{ "error": { "code": "...", "message": "...", "details": ... } }`
- Automated tests: `cd backend && npm test` (first run downloads a MongoDB binary; set `MONGOMS_SYSTEM_BINARY` to reuse a local `mongod`)
- On this machine (C: almost full), run tests with temp files on D:: `TEMP="$PWD/.tmp" TMP="$PWD/.tmp" npm test` from `backend/`
- On Windows, run Vitest from an **uppercase** drive path (`D:\project\doctor_tracker\backend`). From `d:\…` every suite fails with "Vitest failed to find the runner". PowerShell: `Set-Location D:\project\doctor_tracker\backend; $env:TEMP="$PWD\.tmp"; $env:TMP=$env:TEMP; npm test`
- In curl, add `-g` to URLs containing `[` `]` (e.g. `?status[$ne]=x`), otherwise curl treats them as a glob range

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
| 2 | Create | `curl -b $J -X POST $B/api/doctors -H "Content-Type: application/json" -d '{"name":"Dr. Nusrat Jahan","specialization":"Neurology","hospital":"Dhanmondi Lakeview Hospital","phone":"+880 1712-345678","email":"nusrat.jahan@lakeview-dhaka.example.org","yearsOfExperience":14,"joinedAt":"2021-04-12"}'` | `201`, `status: "active"`, `patientCount: 0`, no `searchKey` |
| 3 | Duplicate email (other case) | same body with `"email":"NUSRAT.JAHAN@lakeview-dhaka.example.org"` | `409 CONFLICT`, `details.fields: ["email"]` |
| 4 | Validation | `{"name":"X","specialization":"Wizardry","phone":"abc","email":"no","yearsOfExperience":-2,"joinedAt":"2999-01-01"}` | `400`, one message per field (`Hospital is required`, `Cannot be negative`, `Date cannot be in the future`…) |
| 5 | Default list | `curl -b $J $B/api/doctors` | newest first, `meta { page, limit, total, totalPages }` |
| 6 | Search | `?search=jah` · `?search=8801712` · `?search=NUSRAT%20jah` | surname prefix, phone digits, multi-word (case-insensitive) |
| 7 | Filters | `?specialization=Cardiology` · `?status=on_leave` · `?hospital=City%20General` · `?joinedFrom=2021-01-01&joinedTo=2023-12-31` · `?expMin=10&expMax=25` | only matching doctors |
| 8 | Pagination | `?limit=2&page=2&sort=name` | `meta.page 2`, correct slice |
| 9 | Bad query | `?limit=500` | `400`, `limit: Too big: expected number to be <=50` |
| 10 | Hospitals | `$B/api/doctors/hospitals` | distinct names A→Z |
| 11 | Options | `$B/api/doctors/options?search=tan` | `[{ id, name, specialization }]` |
| 12 | Get by id | `$B/api/doctors/<id>` · unknown id · `not-an-id` | `200` · `404` · `400 Invalid id` |
| 13 | Update | `curl -b $J -X PATCH $B/api/doctors/<id> -d '{"name":"Dr. Nusrat Jahan Chowdhury"}' -H "Content-Type: application/json"` | `200`; `?search=chow` now finds her |
| 14 | Delete guard | delete a doctor who has a patient | `409 DOCTOR_HAS_PATIENTS`, `details.patientCount` |
| 15 | Delete | delete after removing the patients, then GET | `204`, then `404` |
| 16 | Index usage | `cd backend && npm run db:explain` | every line starts with `✓ index` (no `COLLSCAN`) |

**Result 2026-11-14:** all 16 passed against Atlas; `npm test` 44/44. Two demo doctors (Dr. Samir Haddad, Dr. Aisha Rahman) were left on Atlas; the 2.3 seed replaces them.

### 2.2 Patients API
Setup: log in with a cookie jar (§ 1.2 step 3) and create two doctors (§ 2.1 step 2); call their ids `$D1` and `$D2`. Add `-b $J` to every request.

| # | Scenario | Command | Expected |
|---|---|---|---|
| 1 | No session | `curl -i $B/api/patients` | `401 UNAUTHENTICATED` |
| 2 | Create | `curl -b $J -X POST $B/api/patients -H "Content-Type: application/json" -d '{"name":"Sadia Rahman","age":34,"gender":"female","phone":"+880 1819-222333","email":"Sadia.Rahman@Example.com","condition":"Asthma","admissionDate":"2026-03-15","notes":"Inhaler review","doctorId":"'$D1'"}'` | `201`, `status: "active"`, lowercased email, `doctor: { id, name, specialization }`, no `searchKey` |
| 3 | Unknown doctor | same body with `"doctorId":"64b7f0000000000000000000"` | `404 DOCTOR_NOT_FOUND`, `details.fields: ["doctorId"]` |
| 4 | Validation | `{"name":"X","age":200,"gender":"robot","phone":"abc","email":"no","condition":"Flu","admissionDate":"2999-01-01"}` | `400`, one message per field incl. `doctorId: Choose a doctor`, `age: Must be 120 or less` |
| 5 | Create under a doctor | `POST $B/api/doctors/$D2/patients` with a patient body (no or another `doctorId`) | `201`, `doctorId` = `$D2`; missing `email`/`notes` come back as `null` |
| 6 | Default list | `curl -b $J $B/api/patients` | newest admission first, each row has `doctor` |
| 7 | Search | `?search=rah` · `?search=880-1819` · `?search=sadia%20ra` | name-word prefix, phone digits (dashes ignored), multi-word |
| 8 | Filters | `?condition=Diabetes` · `?status=recovered` · `?gender=female` · `?doctorId=$D2` · `?admittedFrom=2026-01-01&admittedTo=2026-12-31` · `?admittedTo=2025-08-01` (inclusive) · `?condition=&status=` (ignored) | only matching patients |
| 9 | Pagination | `?limit=2&page=2&sort=name` | `meta.page 2`, correct slice |
| 10 | Bad query | `?limit=500&gender=robot&sort=age` | `400` with a message for each of `limit`, `gender`, `sort` |
| 11 | Doctor's patients | `$B/api/doctors/$D2/patients?sort=name` | only `$D2`'s patients |
| 12 | Doctor's patients, unknown doctor | `$B/api/doctors/64b7f0000000000000000000/patients` | `404 NOT_FOUND` "Doctor not found" |
| 13 | Get by id | `$B/api/patients/<id>` · unknown id · `not-an-id` | `200` with `doctor` · `404` · `400 Invalid id` |
| 14 | Rename | `PATCH $B/api/patients/<id>` `{"name":"Sadia Islam"}` | `200`; `?search=isl` finds her, `?search=rahman` doesn't |
| 15 | Reassign | `PATCH` `{"doctorId":"'$D2'"}` | `doctor` is now `$D2`; `GET /api/doctors` shows the counts moved |
| 16 | Reassign to unknown doctor | `PATCH` `{"doctorId":"64b7f0000000000000000000"}` | `404 DOCTOR_NOT_FOUND`, patient unchanged |
| 17 | Clear optional fields | `PATCH` `{"email":"","notes":null}` | `200`, `email: null`, `notes: null` |
| 18 | Empty update | `PATCH` `{}` | `400 Provide at least one field to update` |
| 19 | Doctor delete guard | `DELETE $B/api/doctors/$D2` while it has patients | `409 DOCTOR_HAS_PATIENTS`, `details.patientCount` |
| 20 | Delete patient | `DELETE $B/api/patients/<id>`, then GET and DELETE again | `204`, then `404`, `404` |
| 21 | Operator keys | `curl -g -b $J "$B/api/patients?doctorId[\$ne]=x&condition[\$in]=Asthma"` | `200`, filters ignored (all patients) |
| 22 | Index usage | `cd backend && npm run db:explain` | every line starts with `✓ index`; the 8 `patients:` lines use `doctorId_…`, `admissionDate_…`, `searchKey_1`, `condition_…`, `status_…`, `name_1__id_1` |

**Result 2026-11-15:** scenarios 1–21 passed against a local throwaway MongoDB 8.2, then again against **Atlas** (8.0.37, test patients deleted afterwards); `db:explain` on 402 patients / 14 doctors: every query uses an index. `npm test` 70/70.

### 2.3 Dashboard API + seed
Setup: `cd backend && npm run seed` → `Seeded 127.0.0.1/doctor_tracker (today in Asia/Dhaka: …) · doctors 15 (11 active) · patients 200, admitted <1st of the month 11 months ago> → <recent date>`. Data is Bangladeshi: names like "Dr. Priyanka Sen", hospitals like "Dhanmondi Lakeview Hospital", phones `+880 1XXX-XXXXXX`. Start the API, log in (§ 1.2 step 3).

| # | Scenario | Command | Expected |
|---|---|---|---|
| 1 | Seed is repeatable | run `npm run seed` twice, compare doctors/patients | identical names, emails, conditions, dates (fixed faker seed; dates move with today) |
| 2 | No session | `curl -i $B/api/dashboard/stats` | `401` |
| 3 | Bad range | `?range=7d` | `400`, `range: Use 30d, 90d or 12m` |
| 4 | 30d | `curl -b $J "$B/api/dashboard/stats?range=30d"` | 30 daily buckets ending today, empty days as `0`; `sum(patientsOverTime) = kpis.newPatients.current`; `deltaPct` vs the 30 days before |
| 5 | 90d | `?range=90d` | 13 weekly buckets, each a Monday; sum = `newPatients.current` |
| 6 | 12m | `?range=12m` | 12 monthly buckets (`YYYY-MM-01`); `current` = 200, `previous` = 0, `deltaPct: null` |
| 7 | Breakdowns | any range | `byCondition` (11 keys, most first), `byStatus` (`active`, `under_treatment`, `recovered` in that order), `doctorsBySpecialization` (10 keys), `topDoctors` ≤ 10 with names |
| 8 | Cache | call the same range twice | second call ~2 ms, same `generatedAt` |
| 9 | Cache cleared on write | create / edit / delete a patient or doctor, call again | new `generatedAt`, updated numbers |
| 10 | Index usage | `npm run db:explain` | 22 lines, all `✓ index`; the 7 `dashboard:` lines read 0 documents (`COUNT_SCAN` / `PROJECTION_COVERED`) |
| 11 | Sync to Atlas | `npm run db:sync -- --yes`, then `npm run db:sync` | preview shows equal counts on both sides (users 1, doctors 15, patients 200) |

**Result 2026-11-15:** all passed on the local DB (MongoDB 8.3.1) and, after `db:sync`, on Atlas (8.0.37): document-by-document hash of users / doctors / patients identical on both, same indexes. Stats on Atlas: cold ≈ 0.43 s (10 queries in parallel over the network), cached ≈ 2 ms. `npm test` 78/78.

### 2.x Bangladesh + timezone update
| # | Scenario | How | Expected |
|---|---|---|---|
| 1 | Seed is Bangladeshi | `npm run seed`, look at a few doctors / patients | Bangladeshi names, Bangladeshi city hospitals, every phone matches `+880 1[3-9]XX-XXXXXX`, no "other"-gender minors |
| 2 | "Today" follows Dhaka | `npx vitest run tests/dates.test.ts` (clock faked to 20:00 UTC = 02:00 Dhaka next day) | today's Dhaka date accepted as admission date, tomorrow rejected |
| 3 | Dashboard boundary | `periodFor` test at 20:00 UTC | 30d window ends with the Dhaka date, `to` = start of the next Dhaka day |
| 4 | Atlas in sync | `npm run db:sync` (preview) | equal counts on both sides |

**Result 2026-11-15:** `npm test` 82/82; seed checks passed; Atlas synced (users 1, doctors 15, patients 200).

### 3.1 Frontend scaffold + design system
From `frontend/`: `npm install` once.

| # | Scenario | Command | Expected |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | "Types generated successfully", no errors |
| 2 | Lint | `npm run lint` | no output (0 problems) |
| 3 | Build | `npm run build` | "Cache Components enabled", routes listed as `○ (Static)` |
| 4 | Security headers | `npm start`, then `curl -I http://localhost:3000/` | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`; no `X-Powered-By` |
| 5 | API rewrite | with the backend running: `curl http://localhost:3000/api/health` | the backend's `{"status":"ok","db":"up",…}` |
| 6 | Fonts / theme | open http://localhost:3000 | IBM Plex Sans, paper background; `document.documentElement.dataset.theme = 'dark'` in devtools re-colours the page |

Primitives were checked visually on a temporary `/kit` page (deleted at the end of the module): desktop and emulated 390px phone, light and dark, dialog / toasts / open select / date popover, no horizontal scroll on the phone, plus a scripted keyboard run (Select navigation, type-ahead, Escape order inside a dialog, focus return, `inert` app root). They'll be exercised for real on the feature pages in milestone 4.

**Tip for phone screenshots on Windows:** headless Chrome can't size a window below ~500px; use DevTools-protocol device emulation (`Emulation.setDeviceMetricsOverride`) instead of `--window-size`.

**Result 2026-11-15:** all passed.

### 3.2 Auth + app shell
Start the API (`cd backend && npm run dev`) and the frontend (`cd frontend && npm run build && npm start`, or `npm run dev`). Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env`.

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Protected page signed out | open http://localhost:3000/doctors?page=2 in a private window | lands on `/login?next=%2Fdoctors%3Fpage%3D2` |
| 2 | Empty submit | click "Sign in" with empty fields | "Enter your email address" / "Enter your password" under the fields |
| 3 | Wrong password | real email + wrong password | red alert "Email or password is incorrect.", password field selected |
| 4 | Too many attempts | 11 wrong passwords | "Too many sign-in attempts. Please wait 15 minutes…" |
| 5 | Sign in | correct password | back on `/doctors?page=2`; account menu shows your name |
| 6 | Open redirect | signed in, open `/login?next=https://evil.example` | stays on the site (`/dashboard`) |
| 7 | Silent refresh | start the API with `ACCESS_TOKEN_TTL_SECONDS=40`, sign in, wait 15 s, click another page | page loads normally; devtools → Network shows new `dt_access` / `dt_refresh` Set-Cookie on that document request |
| 8 | Access cookie gone | devtools → Application → Cookies → delete `dt_access`, reload | page loads (refreshed), `dt_access` is back |
| 9 | Sign out | account menu → Sign out | on `/login`; back button / any protected URL → `/login` |
| 10 | Theme | toggle the moon/sun, reload | choice kept, no flash of the other theme on reload |
| 11 | Sidebar | "Collapse sidebar", reload | stays collapsed (64px rail) with no jump |
| 12 | Responsive | resize to ~900px, then ~390px | tablet: icon rail; phone: top bar + menu button → drawer (Escape / backdrop / link closes it) |
| 13 | Keyboard | Tab from the top of a page | first stop "Skip to main content"; visible focus ring everywhere; drawer and account menu trap / return focus |
| 14 | API outage | stop the API while signed in, reload | page and shell still render; account icon shows a warning with "Sign out"; you are not signed out |
| 15 | 404 | open `/nope` | styled "Page not found" with a link to the dashboard |

Automated equivalents ran on 2026-11-15: an end-to-end script against the production build + API (22 checks: redirects, `next`, open-redirect guard, refresh with fresh / missing / expiring tokens, prefetch without refresh, logout, revoked / garbage tokens) and a headless-Chrome run of the UI (26 checks: scenarios 1–3, 5, 9–13 and the drawer). Prefetch requests skip the proxy: compare a link hover (prefetch, no Set-Cookie) with a click (navigation, refresh if needed).

**Result 2026-11-15:** 22/22 + 26/26; the API outage behaved as in #14.

## Edge-case checklist (global)
- [x] Every protected endpoint returns 401 without a cookie (`/api/auth/me`, `/api/doctors/*`, `/api/patients/*`, `/api/dashboard/*`)
- [x] Every protected page redirects to `/login?next=` without a session (proxy); `?next=` can't point off-site
- [x] Invalid ObjectId in a path → 400, not 500
- [x] Unknown route → 404 with error shape
- [x] Malformed JSON body → 400 with error shape
- [x] `limit` > 50 is rejected/capped
- [x] Operator injection (`{"$gt": ""}`) in body/query is rejected (body → 400; `?status[$ne]=x` keys are ignored)
