# Doctor Tracker — Frontend Guide

> Updated after each module. Sections marked _(planned)_ are not built yet.

## Stack
Next.js 16 App Router · TypeScript · Tailwind CSS 4 · `motion` (Framer Motion) · Redux Toolkit · React Hook Form + Zod · Recharts. **No UI component library** — every component is hand-built.

## Routes _(planned)_
| Route | Type | Notes |
|---|---|---|
| `/login` | public | redirects to `/dashboard` if a session exists |
| `/dashboard` | protected | `?range=30d\|90d\|12m` |
| `/doctors` | protected | `?page&limit&search&specialization&hospital&status&joinedFrom&joinedTo&expMin&expMax&sort` |
| `/doctors/[id]` | protected | doctor profile + their patients (same query params as patients) |
| `/patients` | protected | `?page&limit&search&condition&status&gender&doctorId&admittedFrom&admittedTo&sort` |

## Data flow _(planned)_
- **Reads:** Server Components call `serverFetch()` → backend directly (`BACKEND_URL`), forwarding the access-token cookie. List pages read `searchParams` → fetch → render.
- **Writes:** Client components call `clientFetch()` → same-origin `/api/*` (Next rewrite → Express). On 401 → single-flight `POST /api/auth/refresh` → retry once → else redirect `/login`. After success → `router.refresh()`.
- **Session refresh on navigation:** `src/proxy.ts` decodes the access-token `exp`; if expired (or < 30 s left) it calls the backend refresh endpoint, sets the rotated cookies on both the forwarded request and the response.

## Backend auth contract (built in module 1.2)
| Thing | Value |
|---|---|
| Cookies | `dt_access` (JWT, 15 min) and `dt_refresh` (opaque, 7 days); both `HttpOnly; SameSite=Lax; Path=/` |
| Login | `POST /api/auth/login { email, password }` → `{ data: { user } }` |
| Current user | `GET /api/auth/me` → `{ data: { user: { id, name, email, role } } }` |
| Refresh | `POST /api/auth/refresh` (cookie only) → rotated cookies; 401 `SESSION_EXPIRED` / `SESSION_REVOKED` means go to `/login` |
| Logout | `POST /api/auth/logout` → 204 |
| 401 codes | `UNAUTHENTICATED` (no or invalid token), `TOKEN_EXPIRED` (refresh then retry), `INVALID_CREDENTIALS` (login form message) |
| 429 | `RATE_LIMITED` after 10 failed logins in 15 min; show "Too many attempts, try again later" |
| Parallel refreshes | Safe: the backend accepts the same refresh token twice within 10 s, so the proxy and the browser racing each other won't log the user out |

## Backend doctors contract (built in module 2.1)
| Thing | Value |
|---|---|
| List | `GET /api/doctors?page&limit&search&specialization&hospital&status&joinedFrom&joinedTo&expMin&expMax&sort` → `{ data: Doctor[], meta: { page, limit, total, totalPages } }` |
| Doctor shape | `{ id, name, specialization, hospital, phone, email, status, yearsOfExperience, joinedAt, createdAt, updatedAt, patientCount }` (dates are ISO strings) |
| Sort values | `-createdAt` (default), `createdAt`, `name`, `-name`, `-joinedAt`, `joinedAt`, `-yearsOfExperience`, `yearsOfExperience` |
| Dropdown data | `GET /api/doctors/hospitals` → `string[]`; `GET /api/doctors/options?search=` → `[{ id, name, specialization }]` (≤ 20, for async selects) |
| Create / edit | `POST /api/doctors`, `PATCH /api/doctors/:id`; dates as `YYYY-MM-DD` |
| Validation errors | `400 { error: { code: 'VALIDATION_ERROR', details: [{ path, message }] } }`, one message per field, so map `path` straight onto form fields |
| Duplicate email | `409 { error: { code: 'CONFLICT', details: { fields: ['email'] } } }` → show on the email field |
| Delete guard | `409 DOCTOR_HAS_PATIENTS`, `details.patientCount` → explain in the confirm dialog |
| Limits | `limit` max 50; empty params are ignored, so it's fine to send `?status=` |
| Enum values | must match backend `constants/enums.ts` (mirror in `frontend/src/lib/constants.ts`) |

## Backend patients contract (built in module 2.2)
| Thing | Value |
|---|---|
| List | `GET /api/patients?page&limit&search&condition&status&gender&doctorId&admittedFrom&admittedTo&sort` → `{ data: Patient[], meta }` |
| Doctor's patients | `GET /api/doctors/:id/patients?…` (same params minus `doctorId`) for the doctor profile table; 404 if the doctor is gone |
| Patient shape | `{ id, name, age, gender, phone, email: string \| null, condition, status, admissionDate, notes: string \| null, doctorId, doctor: { id, name, specialization } \| null, createdAt, updatedAt }` (dates are ISO strings) |
| Sort values | `-admissionDate` (default), `admissionDate`, `name`, `-name`, `-createdAt` |
| Create | `POST /api/patients` with `doctorId` (patients page), or `POST /api/doctors/:id/patients` without it (doctor page); `admissionDate` as `YYYY-MM-DD` |
| Edit | `PATCH /api/patients/:id`; changing `doctorId` reassigns. Send `email: ""` / `notes: ""` to clear them (an emptied input works as-is) |
| Doctor select | async options from `GET /api/doctors/options?search=`; pre-fill edit forms from `patient.doctor` |
| Unknown doctor | `404 { error: { code: 'DOCTOR_NOT_FOUND', details: { fields: ['doctorId'] } } }` → show on the doctor select (the doctor was deleted meanwhile) |
| Validation errors | same as doctors: `details: [{ path, message }]`, one per field |
| Delete | `DELETE /api/patients/:id` → 204 (hard delete; confirm first). Afterwards `router.refresh()` also updates the doctor's `patientCount` |
| Enum values | `CONDITIONS`, `PATIENT_STATUSES` (`active`, `under_treatment`, `recovered`), `GENDERS` (`male`, `female`, `other`) |

## State (Redux Toolkit) _(planned)_
- `ui` slice — sidebar collapsed, theme, open dialog descriptor
- `auth` slice — current user (hydrated from the protected layout)
- `toast` slice — toast queue
- Filter **drafts** live in local component state / ui slice; **applied** filters live in the URL.

## Design system — "Clinical ledger" _(planned)_
- Tokens in `globals.css` `@theme`: paper `#FAF9F6`, ink `#1C1F23`, teal accent `#0F6E6E`, hairline borders, dark theme via `[data-theme="dark"]`.
- Type: IBM Plex Sans (UI), IBM Plex Mono / tabular numerals for figures.
- Motion: subtle — row stagger, dialog scale/fade, sidebar active indicator (`layoutId`), number count-up. Respect `prefers-reduced-motion`.
- Avoid: gradients, glassmorphism, emoji icons, oversized rounded cards.

## Component tree _(planned)_
Filled in as modules are completed.
