# Doctor Tracker — Feature Spec (living document)

> Updated **only** when a module passes verification. Last updated: 2026-11-15 (module 2.3 verified; milestone 2 complete).

## Overview
Doctor Tracker is a secure admin portal for managing doctors and the patients assigned to them, with an analytics dashboard.
- **frontend/** — Next.js 16 (App Router, TypeScript, Tailwind CSS 4, Framer Motion via `motion`, Redux Toolkit, Recharts)
- **backend/** — Express 5 + Mongoose 9 (TypeScript), REST API
- **Database** — MongoDB: local for development (Windows service or docker-compose), Atlas as the shared copy / production. `npm run db:sync` keeps them identical
- **Hosting** — Vercel (frontend) · Render (backend) · MongoDB Atlas

## How these docs are organized
| File | What it's for |
|---|---|
| `milestone-N/walkthrough.md` | index of every file the milestone produced + reading order |
| `milestone-N/module-N/walkthrough.md` | **learning guide**: each created/changed file explained, design reasons, flows, verification, checkpoint summary |
| `milestone-N/module-N/tasks.md` · `progress.md` · `context.md` | checklist · status · API contracts and decisions |
| `doctor-tracker_qa_guide.md` | commands to verify each module by hand |
| `doctor-tracker_fe_guide.md` | frontend conventions and contracts |

## Confirmed decisions (Phase 1)
| # | Area | Decision |
|---|---|---|
| 1 | Repo | `frontend/` (Next.js App Router, TS) + `backend/` (Express + Mongoose, TS), separate `package.json` + `.env.example`, no monorepo tooling |
| 2 | Auth | No signup, seeded admin, bcrypt. 15 min access JWT + rotating 7-day refresh token (stored hashed, reuse ⇒ revoke the session family), both httpOnly cookies. Next forwards `/api/*` → Express (same origin, `SameSite=Lax`). Next `proxy.ts` guards pages and refreshes expired access tokens; Express verifies JWT + `role: admin` on every route except login/refresh |
| 3 | Patient | name, age, gender, phone, email?, condition (fixed list), status (Active / Under treatment / Recovered), admissionDate, notes, `doctorId` (exactly one doctor, indexed). Editing a patient can reassign the doctor |
| 4 | Doctor | name, specialization (fixed list), hospital (free text, distinct-value filter), phone, email (unique), status (Active / On leave / Inactive), yearsOfExperience, joinedAt. Filters: specialization, hospital, status, joined range, experience range. List shows patient count |
| 5 | Deletes | Patient hard delete with confirm (both pages). Doctor edit + delete; delete blocked (409) while patients exist |
| 6 | Search | Lowercased indexed `searchKey` (name / email / phone), anchored prefix regex, 300 ms debounce |
| 7 | Pagination | Numbered pages 10/20/50, server cap 50, `find` + `countDocuments` in parallel, `.lean()` + projections, compound indexes, state in URL |
| 8 | Dashboard | KPIs with delta vs previous period, patients over time, top-10 patients per doctor, condition & status breakdowns, doctors by specialization; presets 30d / 90d / 12m; one endpoint, parallel aggregations, 60 s cache; Recharts |
| 9 | Data layer | Server Components fetch with Next `fetch` (cookies forwarded); URL is the source of truth for list queries; Redux Toolkit holds UI state (dialogs, current user, filter drafts, toasts); mutations via client fetch wrapper → `router.refresh()` |
| 10 | UI | No component library — all components custom; Tailwind CSS; Framer Motion; "Clinical ledger" (paper / ink / teal, IBM Plex Sans + tabular numerals, hairlines, collapsible sidebar, light/dark); responsive & accessible |
| 11 | API security | Zod on all inputs, helmet, CORS allowlist, rate limits, injection protection, body cap, central error handler `{ error: { code, message, details } }`, pino logging |
| 12 | Seed | 1 admin, ~15 doctors, ~200 patients over 12 months, faker with fixed seed |
| 13 | Deploy | Vercel + Render + Atlas; configs/docs + docker-compose for local MongoDB prepared; user deploys |
| 14 | Testing | Per-module curl + `explain()` verification; Vitest + Supertest for auth / validation / delete guard; frontend typecheck + lint + build + browser check |

## Completed modules
| Module | Verified | Summary |
|---|---|---|
| 1.1 Project scaffold | 2026-11-14 | Repo + Express 5 / TypeScript backend: validated env, pino logging, unified error shape, Zod `handler()` wrapper, helmet, CORS allowlist, 10kb body cap, rate limiting, Atlas connection, graceful shutdown, fail-fast on busy port. 6 automated tests + manual curl checks |
| 1.2 Auth API | 2026-11-14 | Seeded admin, bcrypt login, 15-min JWT access token + rotating 7-day refresh token in httpOnly/Lax cookies, atomic rotation with reuse detection (10 s grace), logout revokes the session family, `requireAuth` / `requireRole`, login brute-force limit. 16 automated tests + manual flow on Atlas |
| 2.1 Doctors API | 2026-11-14 | Doctor + Patient models with ESR indexes, doctor CRUD, indexed prefix search (`searchKey`), 5 filters + 8 sorts, page-number pagination (parallel find + count), patient counts in one `$group`, delete guard, hospitals + options lookups, `npm run db:explain`. 22 automated tests + 16 manual checks |
| 2.2 Patients API | 2026-11-15 | Patient CRUD with doctor reassignment, indexed search, 6 filters + 5 sorts, pagination, each row's doctor via one `$in` query, nested `/api/doctors/:id/patients` (list + create, doctor lookup in parallel), clearable `email`/`notes`, 404 `DOCTOR_NOT_FOUND` for unknown body doctors, name-sort index. 26 automated tests (70 total) + 21 manual checks (local and Atlas); every patient query uses an index |
| 2.3 Dashboard API + seed | 2026-11-15 | `GET /api/dashboard/stats?range=30d\|90d\|12m`: KPIs with delta vs previous period, zero-filled time series (bucket-aligned windows, sum = KPI), top-10 doctors, condition / status / specialization breakdowns; 10 parallel index-only queries (0 documents read); 60 s promise cache cleared on writes. Repeatable faker seed (15 doctors, 200 patients). Local MongoDB as the working DB + `npm run db:sync` to Atlas. 8 automated tests (78 total), verified on local and Atlas |

## Current API surface
Base URL (local): `http://localhost:8082`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | public | `200 { status: 'ok', db: 'up', uptime }` · `503` when the DB is down |
| POST | `/api/auth/login` | public (rate-limited) | `{ email, password }` → `{ data: { user } }` + `dt_access` / `dt_refresh` cookies |
| POST | `/api/auth/refresh` | `dt_refresh` cookie | rotates both cookies → `{ data: { user } }` · 401 `SESSION_EXPIRED` / `SESSION_REVOKED` |
| POST | `/api/auth/logout` | cookie optional | 204, revokes the session and clears cookies |
| GET | `/api/auth/me` | `dt_access` cookie | `{ data: { user } }` · 401 `UNAUTHENTICATED` / `TOKEN_EXPIRED` |

| GET | `/api/doctors` | admin | list: `page, limit, search, specialization, hospital, status, joinedFrom, joinedTo, expMin, expMax, sort` → `{ data, meta }` |
| GET | `/api/doctors/hospitals` | admin | distinct hospital names |
| GET | `/api/doctors/options` | admin | `?search=` → `[{ id, name, specialization }]` (≤ 20) |
| GET | `/api/doctors/:id` | admin | doctor + `patientCount` |
| POST | `/api/doctors` | admin | create → 201 · 409 on duplicate email |
| PATCH | `/api/doctors/:id` | admin | partial update |
| DELETE | `/api/doctors/:id` | admin | 204 · 409 `DOCTOR_HAS_PATIENTS` |
| GET | `/api/doctors/:id/patients` | admin | the doctor's patients: same query as `/api/patients` (minus `doctorId`) · 404 unknown doctor |
| POST | `/api/doctors/:id/patients` | admin | create a patient under this doctor → 201 · 404 unknown doctor |

| GET | `/api/patients` | admin | list: `page, limit, search, condition, status, gender, doctorId, admittedFrom, admittedTo, sort` → `{ data, meta }`; rows include `doctor { id, name, specialization }` |
| GET | `/api/patients/:id` | admin | patient + `doctor` |
| POST | `/api/patients` | admin | create (`doctorId` in body) → 201 · 404 `DOCTOR_NOT_FOUND` |
| PATCH | `/api/patients/:id` | admin | partial update; `doctorId` reassigns; `email`/`notes` = `""` or `null` clears |
| DELETE | `/api/patients/:id` | admin | 204 · 404 |

| GET | `/api/dashboard/stats` | admin | `?range=30d\|90d\|12m` (default 30d) → `{ range, generatedAt, period, kpis, patientsOverTime, topDoctors, byCondition, byStatus, doctorsBySpecialization }`, cached 60 s |

Scripts (from `backend/`):
| Script | What it does |
|---|---|
| `npm run seed` | upserts the admin, replaces doctors + patients with 15 / 200 repeatable demo records (refuses `NODE_ENV=production` without `--force`) |
| `npm run seed:admin` | only the admin (uses `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`) |
| `npm run db:explain` | the index behind each list and dashboard query (22) |
| `npm run db:sync` | preview; `-- --yes` pushes local → Atlas (`SYNC_TARGET_URI`), `-- --pull --yes` pulls |

## Known issues
- **SRV lookups fail on this office network.** Node's resolver gets a malformed answer from the router for `mongodb+srv://` addresses (`querySrv EBADRESP`). Workaround in place: `SYNC_TARGET_URI` uses Atlas's standard `mongodb://host1,host2,host3` string. On Render, the SRV string works.
- The dashboard cache is per process (fine for one instance; use Redis if the API is scaled out).
