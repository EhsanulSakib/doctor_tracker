# Doctor Tracker — Frontend Guide

> Updated after each module. Sections marked _(planned)_ are not built yet.

## Stack
Next.js 16.4 App Router (Cache Components, Partial Prefetching, React Compiler) · TypeScript 5.9 · Tailwind CSS 4.3 · `motion` 14 (Framer Motion, `motion/react`) · Redux Toolkit 2.14 · React Hook Form + Zod (3.2) · Recharts (4.3). **No UI component library**: every component is hand-built (`src/components/ui`).

## Rules of the codebase (built in 3.1)
- **Cache Components:** a component that calls `serverFetch` (it reads cookies) must sit inside `<Suspense>` or a route with `loading.tsx`, or `next build` fails. Don't `await` session/data at a layout's top level; push it into a component inside a boundary.
- **React Compiler is on:** don't hand-write `useMemo`/`useCallback`/`memo` for performance. Lint enforces React 19 rules: no synchronous `setState` inside effects, no reading `ref.current` during render.
- **Colours only through tokens** (`bg-surface`, `text-ink-muted`, `border-line`, `bg-accent`…), never hex values or Tailwind's palette. Merge classes with `cn()`.
- **Overlays** go through `<Portal>` (dialog z-50 · popover/listbox z-60 · toasts z-70). Modals make `#app-root` inert.
- **Motion:** only `m.*` components (LazyMotion strict) with variants from `lib/motion.ts`.
- **Bangladesh formatting:** use `formatDate` / `formatDateTime` / `formatNumber` / `todayIso` from `lib/utils.ts` (day-first dates, 12-hour time, lakh grouping, Asia/Dhaka "today"). Phone placeholder `PHONE_PLACEHOLDER` (`+880 1712-345678`).

## Routes
| Route | Type | Notes |
|---|---|---|
| `/` | redirect | → `/dashboard` (next.config) _(built in 3.2)_ |
| `/login` | public, static | proxy sends signed-in visitors to `?next=` or `/dashboard` _(built in 3.2)_ |
| `/dashboard` | protected | `?range=30d\|90d\|12m` (placeholder until 4.3) |
| `/doctors` | protected | `?page&limit&search&specialization&hospital&status&joinedFrom&joinedTo&expMin&expMax&sort` |
| `/doctors/[id]` | protected | doctor profile + their patients (same query params as patients) |
| `/patients` | protected | `?page&limit&search&condition&status&gender&doctorId&admittedFrom&admittedTo&sort` |

## Data flow
- **Reads** _(fetch layer built in 3.1)_: Server Components call `serverFetch<T>(path, { searchParams })` → backend directly (`BACKEND_URL`), forwarding only the `dt_access` cookie, `cache: 'no-store'`. 401 → `redirect('/login')` (backstop). List pages read `searchParams` → fetch → render.
- **Writes** _(built in 3.1)_: client components call `clientFetch<T>(path, { method, body })` → same-origin `/api/*` (Next rewrite → Express). On 401 → single-flight `POST /api/auth/refresh` → retry once → else full reload to `/login?next=<page>`. After success → `router.refresh()`.
- **Errors:** both throw `ApiError { status, code, message, details }`; `error.fieldErrors` gives `{ field: message }` for VALIDATION_ERROR / CONFLICT / DOCTOR_NOT_FOUND, ready for form fields. Network failure → `code: 'NETWORK_ERROR'`.
- **Session refresh on navigation** _(built in 3.2)_: `src/proxy.ts` decodes the access-token `exp`; if missing, expired or < 30 s left it calls the backend refresh endpoint and sets the rotated cookies on both the forwarded request and the response. Refresh 401 → cookies cleared, `/login?next=`; API unreachable → request passes (no sign-out). Prefetches skip the proxy (matcher `missing`).
- **Current user** _(built in 3.2)_: `getCurrentUser()` (server-only, React `cache`); call it inside `<Suspense>`. The shell already shows it in the account menu and puts it in the `auth` slice.
- **Safe redirects:** use `safeNextPath()` (`lib/auth/session.ts`) for any `?next=`-style value.

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

## Backend dashboard contract (built in module 2.3)
| Thing | Value |
|---|---|
| Endpoint | `GET /api/dashboard/stats?range=30d\|90d\|12m` (default `30d`) → `{ data: DashboardStats }`; 400 for other ranges |
| Shape | `{ range, generatedAt, period: { unit, from, to, previousFrom }, kpis: { totalDoctors, activeDoctors, totalPatients, newPatients: { current, previous, deltaPct }, avgPatientsPerDoctor }, patientsOverTime: [{ bucket, count }], topDoctors: [{ id, name, specialization, count }], byCondition: [{ key, count }], byStatus: [{ key, count }], doctorsBySpecialization: [{ key, count }] }` |
| Buckets | `30d` → 30 days, `90d` → 13 weeks (each bucket = its Monday), `12m` → 12 months (`YYYY-MM-01`). `bucket` is a UTC date string `YYYY-MM-DD`; format labels by `period.unit` (e.g. "Oct 17", "Week of Aug 17", "Dec 2025"). Empty buckets are included with 0, so plot the array as-is |
| Delta | `deltaPct` has one decimal and can be negative; **`null` when there is no previous data** (show "—", never ∞). `12m` is `null` with the seed data |
| Range vs snapshot | only `newPatients` and `patientsOverTime` follow the range; totals, top doctors and breakdowns describe all current data. Label the cards accordingly |
| Breakdowns | every enum value is present (zeros too), so map colors by `key`. `byStatus` order is fixed (`active`, `under_treatment`, `recovered`); the others are sorted by count |
| Freshness | cached up to 60 s, cleared by any doctor / patient write through the API; `generatedAt` says when the numbers were computed |
| Demo data | `npm run seed` → 15 doctors (11 active), 200 patients over the last 12 months |

## State (Redux Toolkit)
- `ui` slice _(built in 3.1)_: `sidebarCollapsed`, `mobileNavOpen`, `theme`, `dialog` (`{ id, entityId? } | null`); actions `sidebarToggled`, `sidebarCollapsedSet`, `mobileNavSet`, `themeSet`, `dialogOpened`, `dialogClosed`
- `toast` slice _(built in 3.1)_: queue (max 4); use `const toast = useToast(); toast.success(title, description?)` / `.error` / `.info`
- `auth` slice _(built in 3.2)_: `user` (`PublicUser | null`), filled by `<AuthHydrator>` from the server; `selectUser`
- Store created per request (`StoreProvider`); typed `useAppDispatch` / `useAppSelector` from `@/store/hooks`.
- Filter **drafts** live in local component state; **applied** filters live in the URL. Server data is never copied into Redux.

## Design system — "Clinical ledger" (built in 3.1)
- Tokens in `globals.css` (full table in module 3.1 `context.md`): `paper` / `paper-2` / `surface`, `ink` / `ink-muted` / `ink-subtle`, `line` / `line-strong`, `accent` (+ `-hover`, `-soft`, `-ink`), `danger` / `warning` / `success` / `info` (+ `-soft`), `overlay`. Dark theme via `data-theme="dark"` on `<html>`; `dark:` utilities follow it. All text pairs WCAG AA.
- Type: IBM Plex Sans 400/500/600 (UI), IBM Plex Mono (IDs, phone numbers, figures), `tabular-nums` in tables/KPIs; `text-title` (22px) for page titles, `text-label` (11px uppercase) for section labels; body 14px, inputs 16px on phones.
- Shape: `rounded-control` (6px), `rounded-panel` (10px); `shadow-overlay` only on dialogs, popovers, toasts; hairline borders everywhere else.
- Sizes: 36px controls with a mouse, 44px on touch (`pointer-coarse:`).
- Motion: 150–250 ms, `ease-clinical`; row stagger on new data, dialog/popover lift, toast slide; `reducedMotion="user"`. Planned: sidebar `layoutId` indicator (3.2), number count-up (4.3).
- Avoid: gradients, glassmorphism, emoji icons, oversized rounded cards.

## UI primitives (built in 3.1)
| Component | Use |
|---|---|
| `Button` / `buttonStyles()` | `variant` primary · secondary · ghost · danger; `size` sm · md · lg; `loading`; `icon`. `buttonStyles()` styles a `<Link>` as a button |
| `IconButton` | icon-only; `label` is required (aria-label + tooltip) |
| `Input` / `Textarea` | `leading` icon, `trailing` element; invalid styling comes from `aria-invalid` |
| `Field` | `<Field label hint error required>{(p, { labelId }) => <Input {...p} />}</Field>`: ids, `aria-describedby`, `aria-invalid` wired |
| `Select` | `value`, `onChange`, `options: { value, label, description? }[]`, `emptyOption="All statuses"` for filters; inside a Field pass `labelId`, otherwise `aria-label` |
| `Badge` | `tone` neutral · accent · success · warning · danger · info; `dot`. Status tones: `DOCTOR_STATUS_TONES`, `PATIENT_STATUS_TONES` |
| `Spinner` / `Skeleton` / `EmptyState` | loading and empty states (`label` on a standalone spinner) |
| `Popover` | `trigger={(props) => <button {...props} />}`, children or `({ close }) => …`, `label` |
| `Dialog` | `open`, `onClose`, `title`, `description`, `footer`, `size`, `dismissible` (false while saving), `initialFocusRef`. Bottom sheet on phones. A footer submit button targets a body form with `form="<id>"` |
| `ConfirmDialog` | `onConfirm` may be async (spinner, not dismissible meanwhile); focus starts on Cancel; caller closes on success |
| `Toaster` | mounted once in providers; use `useToast()` |
| `DataTable` | `columns: Column<T>[]` (`header`, `cell`, `align`, `sort: { asc, desc, first? }`, `mobile: title · meta · field · hidden`, `className`), `rows`, `getRowId`, `caption`, `sort` + `sortHref` (URL) or `onSortChange`, `rowActions`, `loading`, `empty` |
| `Pagination` | `page`, `totalPages`, `total`, `limit`, `hrefForPage` (URL) or `onPageChange`, `onLimitChange` (10 · 20 · 50) |
| `SearchInput` | `onSearch` debounced 300 ms (Enter = now, Escape = clear), `defaultValue`, `label`, `pending`; re-key to reset from outside |
| `DateRangeField` | `value: { from?, to? }` (YYYY-MM-DD, inclusive), `onChange`, `label`; presets (last 7 / 30 / 90 days, 12 months, this year, last year) counted from today in Dhaka |
| `icons.tsx` | hand-drawn 24×24 stroke icons (`size`, decorative by default) |

## App shell (built in 3.2)
```
app/layout.tsx            fonts, pre-paint theme/sidebar script, <Providers> (store, motion, toasts, #app-root)
├── (auth)/login          static sign-in page
└── (app)/layout.tsx      skip link · <Sidebar> · <Topbar userSlot={<Suspense><CurrentUserMenu/></Suspense>}> · <main> · <MobileNav>
    ├── loading.tsx       in-shell skeleton (Suspense boundary for pages)
    ├── error.tsx         in-shell error with retry()
    └── dashboard · doctors · patients
```
- New pages go under `app/(app)/…`, start with `<PageHeader title description actions>`, and fetch data in Server Components inside the route's `loading.tsx` boundary (or their own `<Suspense>`).
- Layout components: `components/layout/` (sidebar, topbar, mobile-nav, user-menu, theme-toggle, page-header, brand, nav-items). Nav entries live in `nav-items.ts`.
- Preferences: `applyTheme` / `applySidebarCollapsed` (`lib/preferences.ts`) write localStorage + the `<html>` attribute; use `dark:` / `sidebar-collapsed:` variants for anything visual.

## Component tree _(planned)_
Filled in as feature modules are completed (milestone 4 pages).
