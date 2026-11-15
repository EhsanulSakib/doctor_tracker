# Doctor Tracker — Feature Spec (living document)

> Updated **only** when a module passes verification. Last updated: 2026-11-15 (module 3.2 verified; milestone 3 complete).

## Overview
Doctor Tracker is a secure admin portal for managing doctors and the patients assigned to them, with an analytics dashboard.
- **frontend/** — Next.js 16 (App Router, TypeScript, Tailwind CSS 4, Framer Motion via `motion`, Redux Toolkit; charts hand-built in SVG / HTML)
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
| 2 | Auth | No signup (as the PDF specifies; re-confirmed with the user 2026-11-15: the Doctors / Patients "panels" are admin pages, not separate logins), seeded admin, bcrypt. 15 min access JWT + rotating 7-day refresh token (stored hashed, reuse ⇒ revoke the session family), both httpOnly cookies. Next forwards `/api/*` → Express (same origin, `SameSite=Lax`). Next `proxy.ts` guards pages and refreshes expired access tokens; Express verifies JWT + `role: admin` on every route except login/refresh |
| 3 | Patient | name, age, gender, phone, email?, condition (fixed list), status (Active / Under treatment / Recovered), admissionDate, notes, `doctorId` (exactly one doctor, indexed). Editing a patient can reassign the doctor |
| 4 | Doctor | name, specialization (fixed list), hospital (free text, distinct-value filter), phone, email (unique), status (Active / On leave / Inactive), yearsOfExperience, joinedAt. Filters: specialization, hospital, status, joined range, experience range. List shows patient count |
| 5 | Deletes | Patient hard delete with confirm (both pages). Doctor edit + delete; delete blocked (409) while patients exist |
| 6 | Search | Lowercased indexed `searchKey` (name / email / phone), anchored prefix regex, 300 ms debounce |
| 7 | Pagination | Numbered pages 10/20/50, server cap 50, `find` + `countDocuments` in parallel, `.lean()` + projections, compound indexes, state in URL |
| 8 | Dashboard | KPIs with delta vs previous period, patients over time, top-10 patients per doctor, condition & status breakdowns, doctors by specialization; presets 30d / 90d / 12m; one endpoint, parallel aggregations, 60 s cache; charts hand-built (SVG + HTML, validated colour tokens) instead of Recharts (decided in 4.3: five simple charts, exact styling, server-rendered, no extra bundle) |
| 9 | Data layer | Server Components fetch with Next `fetch` (cookies forwarded); URL is the source of truth for list queries; Redux Toolkit holds UI state (dialogs, current user, filter drafts, toasts); mutations via client fetch wrapper → `router.refresh()` |
| 10 | UI | No component library — all components custom; Tailwind CSS; Framer Motion; **slate + indigo / violet** (Plus Jakarta Sans, 8/12px radii, soft card shadows, full-width layout; redesigned 2026-11-15 from the original teal "Clinical ledger" at the user's request); collapsible sidebar, light/dark; login with an optimised doctor photo; responsive & accessible |
| 11 | API security | Zod on all inputs, helmet, CORS allowlist, rate limits, injection protection, body cap, central error handler `{ error: { code, message, details } }`, pino logging |
| 12 | Seed | 1 admin, ~15 doctors, ~200 patients over 12 months, faker with fixed seed |
| 13 | Deploy | Vercel + Render + Atlas; configs/docs + docker-compose for local MongoDB prepared; user deploys |
| 14 | Testing | Per-module curl + `explain()` verification; Vitest + Supertest for auth / validation / delete guard; frontend typecheck + lint + build + browser check |
| 15 | Locale (added 2026-11-15) | **Bangladesh**: seed and sample data use Bangladeshi names, fictional hospitals in Bangladeshi cities and `+880` mobile numbers; "today" is Asia/Dhaka (`APP_TIMEZONE`) on the API and the frontend; UI shows day-first dates, 12-hour time and lakh digit grouping |
| 16 | Notifications (added 2026-11-15) | Topbar bell fed by **real domain events** (new doctor, doctor on leave / inactive with patients still assigned, new patient, patient recovered, patient reassigned). **One shared team inbox** (`readAt` on each notification, no per-user state; there is only the admin role). Written after the main save and never failing it; deleted with their doctor / patient; 30-day TTL |
| 17 | Top bar (2026-11-15) | At the user's request: **no visible page titles** (breadcrumb in the top bar; screen-reader-only `<h1>`), 13px breadcrumb, **clock in Bangladesh time** with date, month calendar and **user-added time zones** (saved per browser), **notification bell** with an 18px count circle ("9+") and a ping for unseen items; every item a fixed-size box (CLS 0) |

## Completed modules
| Module | Verified | Summary |
|---|---|---|
| 1.1 Project scaffold | 2026-11-14 | Repo + Express 5 / TypeScript backend: validated env, pino logging, unified error shape, Zod `handler()` wrapper, helmet, CORS allowlist, 10kb body cap, rate limiting, Atlas connection, graceful shutdown, fail-fast on busy port. 6 automated tests + manual curl checks |
| 1.2 Auth API | 2026-11-14 | Seeded admin, bcrypt login, 15-min JWT access token + rotating 7-day refresh token in httpOnly/Lax cookies, atomic rotation with reuse detection (10 s grace), logout revokes the session family, `requireAuth` / `requireRole`, login brute-force limit. 16 automated tests + manual flow on Atlas |
| 2.1 Doctors API | 2026-11-14 | Doctor + Patient models with ESR indexes, doctor CRUD, indexed prefix search (`searchKey`), 5 filters + 8 sorts, page-number pagination (parallel find + count), patient counts in one `$group`, delete guard, hospitals + options lookups, `npm run db:explain`. 22 automated tests + 16 manual checks |
| 2.2 Patients API | 2026-11-15 | Patient CRUD with doctor reassignment, indexed search, 6 filters + 5 sorts, pagination, each row's doctor via one `$in` query, nested `/api/doctors/:id/patients` (list + create, doctor lookup in parallel), clearable `email`/`notes`, 404 `DOCTOR_NOT_FOUND` for unknown body doctors, name-sort index. 26 automated tests (70 total) + 21 manual checks (local and Atlas); every patient query uses an index |
| 2.3 Dashboard API + seed | 2026-11-15 | `GET /api/dashboard/stats?range=30d\|90d\|12m`: KPIs with delta vs previous period, zero-filled time series (bucket-aligned windows, sum = KPI), top-10 doctors, condition / status / specialization breakdowns; 10 parallel index-only queries (0 documents read); 60 s promise cache cleared on writes. Repeatable faker seed (15 doctors, 200 patients). Local MongoDB as the working DB + `npm run db:sync` to Atlas. 8 automated tests (78 total), verified on local and Atlas |
| 2.x Bangladesh update | 2026-11-15 | Seed rewritten for Bangladesh (names, 8 fictional hospitals in Dhaka / Chattogram / Sylhet / Rajshahi / Khulna, `+880 1XXX-XXXXXX`, monsoon + winter admission peaks); `APP_TIMEZONE` (default Asia/Dhaka) decides "today": date fields accept today's Dhaka date (before, 00:00–06:00 Dhaka rejected it as "future") and dashboard windows end with today in Dhaka; local DB re-seeded and synced to Atlas. 4 new tests (82 total) |
| 2.4 Notifications API | 2026-11-15 | Added at the user's request for the topbar bell. `Notification` model (shared inbox, 30-day TTL, list / unread / cleanup indexes); `GET /api/notifications` (with `unreadCount`), `PATCH /:id/read` (idempotent), `POST /read-all`; five event types created by the doctor / patient services, failure-isolated, cleaned up on delete; seed adds 30 notifications (12 unread) from the seeded data; `db:sync` copies them. 16 automated tests (98 total); unread count is a `COUNT_SCAN` reading 0 documents |
| 3.1 Frontend scaffold + design system | 2026-11-15 | Next.js 16.4 app (Cache Components, React Compiler, `/api` rewrite, security headers); "Clinical ledger" tokens for light/dark (WCAG AA); 17 hand-built accessible primitives (Select, Dialog/bottom sheet, Popover, Toaster, DataTable with mobile cards, Pagination, DateRangeField…); `serverFetch` / `clientFetch` with single-flight refresh; Redux UI store; Bangladesh formatting. Typecheck/lint/build clean; visual + keyboard check on the production build |
| 3.2 Auth + app shell | 2026-11-15 | `proxy.ts` guards every page and refreshes sessions before rendering (rotated cookies forwarded to the browser and into the current render; prefetches and `/api` excluded; API outages don't sign users out); sign-in page (brand panel, RHF + Zod, error mapping, open-redirect-safe `next`); static shell with streamed account menu (fallback if the API is down); collapsible sidebar / tablet rail / phone drawer; theme + sidebar preferences applied before paint; error / 404 / loading screens. End-to-end auth 22/22, real-browser run 26/26. **Top bar redesign** (same day, user feedback): hidden page titles, Plus Jakarta Sans, clock + calendar + time zones, notification bell; 20/20 top bar checks |
| 4.1 Doctors UI | 2026-11-15 | `/doctors`: search, inline + dialog filters (specialization, status, hospital, joined range, experience range), removable filter tokens, sortable columns, pagination + page size, create / edit (RHF + Zod, API field errors on fields), delete with the patients guard explained up front; `/doctors/[id]`: profile card, patient stat tiles, the doctor's patients with search / status / condition / sort / paging and add / edit / delete (shared `PatientFormDialog`); URL-as-state with transitions (old rows dimmed while loading); table fills the screen on laptops (inner scroll, sticky header); skeletons = the real table in loading mode; not-found page. Browser run 32/32 |
| 4.2 Patients UI | 2026-11-15 | `/patients`: search, inline status / condition filters, Filters dialog (status, condition, gender, doctor, admission range, sort), removable tokens, sortable columns, pagination; create with a doctor picker, edit with reassignment ("Patient moved"), delete; `DoctorSelect` async combobox over `/api/doctors/options` (debounced, latest request wins, no stale picks); stale `?doctorId=` dropped by redirect; shared `useNavigateTransition` / `FilterTokens` for both lists. Browser run 17/17 |
| 4.3 Dashboard UI | 2026-11-15 | `/dashboard`: range switch (30 days / 90 days / 12 months, `?range=`), "Updated" time, KPI tiles (doctors, patients, new patients with delta or "No earlier data to compare", patients per doctor; values count on range change), five hand-built charts (new patients area chart with crosshair + keyboard + hidden table, patient status tall segmented bar, ranked bars for top doctors / conditions / specializations), palette validated in both themes; fills a laptop screen exactly (no window or page scroll at 1280×720+); matching skeleton. Browser run 18/18. **Milestone 4 complete** |
| 5.1 README | 2026-11-15 | `README.md` to the spec template (Description, Setup Guide with both `.env.example` files, System Architecture with Mermaid data-flow / auth / data-model diagrams, two Technical Decisions, Visual Evidence: 12 desktop + 6 mobile screenshots in `docs/screenshots/`) plus features, indexes with `explain()` results, security, API, testing, scalability and deployment notes. Deployment itself is done by the user |
| UI polish | 2026-11-15 | User feedback: sidebar without the "Menu" label, collapse button by the logo (the logo expands it when collapsed), profile with role tag and sign out at the bottom; circular bell / theme buttons; dropdowns redesigned (panel + cascading options + a highlight that glides between options, check pops in); native date inputs and `<datalist>` replaced by a hand-built `Calendar` (day / month / year views, keyboard grid, range mode), `DatePicker` and `SuggestInput`; dashboard entrance motion (staggered cards, KPI count-up, chart drawing in, bars growing). Fixed: stale sidebar `aria-expanded` after reload (hydration attribute mismatch). Next.js dev indicator moved to the bottom-right. All suites green; new UI checks 13/13 |
| Polish pass | 2026-11-15 | Audit of every screen in both themes on desktop, tablet and a 375px phone. Contrast measured on every text node: 5 issues fixed (clock city, status-block labels via darker validated fills, neutral badge). Tap areas ≥ 40px on touch (range tabs, enlarged link hit areas, whole ranked rows as links). Tablets get two-column cards instead of tables wider than the screen. Bottom sheets slide up with a handle. All icon buttons circular. Account-menu role is the squared tag. Audit clean; all suites green |
| Design-system token audit | 2026-11-15 | `globals.css` restructured into primitive → semantic → component tokens; Tailwind's palette switched off so only tokens produce colour. 112 arbitrary values (plus raw white text and the sidebar / top bar sizes) replaced by tokens or scale steps: type scale `text-micro` / `caption` / `ui` / `lead` / `figure`, radii `mark` / `tag`, layout `sidebar` / `sidebar-rail` / `topbar` / `popover`, quarter spacing steps. Login scrim and logo use component tokens; JavaScript media queries come from `lib/breakpoints.ts`. Proven same look: computed-style diff of 4,112 elements in 13 page states identical except the legend swatch corner (3 → 4px). New reference `docs/design-system.md` |
| KPI tiles: value on the right | 2026-11-15 | Dashboard stat tiles put the label and context line on the left and the number on the right (user request) whenever the tile is wide enough (container query `@kpi`, 13.75rem: 1366px laptops with the sidebar open and wider, collapsed sidebars, tablets). Narrower tiles keep the stacked layout. Tiles are 72px tall side by side (was 90), so charts gain height. Count-up and range switches keep layout shift at 0; the skeleton shares the layout classes |

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

| GET | `/api/notifications` | admin | `?limit=1–50` (default 20) → `{ data: [{ id, type, title, message, subject: { kind, id, name }, read, createdAt }], meta: { unreadCount } }`, newest first |
| PATCH | `/api/notifications/:id/read` | admin | `{ data: notification }`, idempotent · 404 |
| POST | `/api/notifications/read-all` | admin | `{ data: { updated } }` |

Scripts (from `backend/`):
| Script | What it does |
|---|---|
| `npm run seed` | upserts the admin, replaces doctors + patients with 15 / 200 repeatable demo records and rebuilds 30 notifications (12 unread) from them (refuses `NODE_ENV=production` without `--force`) |
| `npm run seed:admin` | only the admin (uses `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`) |
| `npm run db:explain` | the index behind each list, dashboard and notification query (25) + the notifications TTL index |
| `npm run db:sync` | preview; `-- --yes` pushes local → Atlas (`SYNC_TARGET_URI`), `-- --pull --yes` pulls |

The API's `APP_TIMEZONE` (default `Asia/Dhaka`) decides what "today" is for date fields and dashboard ranges.

Frontend (from `frontend/`): `npm run dev` → http://localhost:3000 (start the API first; `BACKEND_URL` defaults to `http://localhost:8082`). Also `npm run typecheck`, `npm run lint`, `npm run build`. Pages: `/login`, and `/dashboard`, `/doctors`, `/patients` inside the app shell. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `backend/.env`.

## Known issues
- **SRV lookups fail on this office network.** Node's resolver gets a malformed answer from the router for `mongodb+srv://` addresses (`querySrv EBADRESP`). Workaround in place: `SYNC_TARGET_URI` uses Atlas's standard `mongodb://host1,host2,host3` string. On Render, the SRV string works.
- The dashboard cache is per process (fine for one instance; use Redis if the API is scaled out).
