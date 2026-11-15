# Doctor Tracker — Frontend Guide

> Updated after each module. Sections marked _(planned)_ are not built yet.

## Stack
Next.js 16.4 App Router (Cache Components, Partial Prefetching, React Compiler) · TypeScript 5.9 · Tailwind CSS 4.3 · `motion` 14 (Framer Motion, `motion/react`) · Redux Toolkit 2.14 · React Hook Form + Zod (3.2) · Recharts (4.3). **No UI component library**: every component is hand-built (`src/components/ui`).

## Rules of the codebase (built in 3.1)
- **Cache Components:** a component that calls `serverFetch` (it reads cookies) must sit inside `<Suspense>` or a route with `loading.tsx`, or `next build` fails. Don't `await` session/data at a layout's top level; push it into a component inside a boundary.
- **React Compiler is on:** don't hand-write `useMemo`/`useCallback`/`memo` for performance. Lint enforces React 19 rules: no synchronous `setState` inside effects, no reading `ref.current` during render.
- **Colours only through tokens** (`bg-surface`, `text-ink-muted`, `border-line`, `bg-accent`…), never hex values or Tailwind's palette. Merge classes with `cn()`.
- **No window scrollbar from `lg` (1024px) up:** the shell is exactly one viewport tall (`lg:h-dvh`) and only `<main>` scrolls (`scrollbar-thin`). Design pages to fit the screen: long lists scroll inside their own region (table body), not the page. Phones and tablets scroll the window as usual. The login page follows the same rule (only the form side may scroll on a very short screen).
- **Skeletons have the same box as the real content:** same heights, margins and fixed widths, so nothing moves when data arrives (measured CLS 0). Reuse `EmptyCardSkeleton` (`components/layout/page-skeleton.tsx`), `DataTable loading` (rows are 44px like real rows) and `UserMenuSkeleton` (shares `TRIGGER_BOX` with the real account button). A page with a different layout gets its own `loading.tsx` built from its real components' measurements.
- **No visible page titles:** the top bar breadcrumb (`Doctor Tracker › Doctors`; the page name on phones) is the visible title. Still give every page `<PageHeader title="…" actions={…} />`: it renders the page's single `<h1>` for screen readers only (`sr-only`) and, if there are actions, a right-aligned row for them. Skeletons therefore start with the first block of the page, not a title row.
- **After a create / update / delete, call `refreshNotifications()`** (`features/notifications/types.ts`): the bell reloads at once instead of at its next one-minute poll.
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

## Backend notifications contract (added in 2.4)
| Thing | Value |
|---|---|
| List | `GET /api/notifications?limit=20` (1–50) → `{ data: Notification[], meta: { unreadCount } }`, newest first. `unreadCount` is for the whole inbox (badge: show "9+" above 9) |
| Item | `{ id, type, title, message, subject: { kind: "doctor" \| "patient", id, name }, read: boolean, createdAt: ISO string }`. Show `title` (bold) + `message` (muted) as-is; they are final copy |
| Types | `patient_admitted`, `patient_recovered`, `patient_reassigned`, `doctor_added`, `doctor_unavailable` (pick the icon / tone by type) |
| Links | `subject.kind === "doctor"` → `/doctors/{subject.id}`; `"patient"` → the patients list searched by name (`/patients?search={subject.name}`), since there is no patient detail page |
| Mark read | `PATCH /api/notifications/:id/read` → `{ data: Notification }` (idempotent; 404 if it expired or its subject was deleted: drop it from the list) |
| Mark all | `POST /api/notifications/read-all` → `{ data: { updated } }` |
| Shared inbox | read state is shared by every admin account; another admin can change the count. Refetch on open / focus / an interval rather than trusting local state |
| When new ones appear | after doctor / patient writes through the API (new doctor, doctor leaves `active`, new patient, recovered, reassigned). Refresh the bell after the frontend's own mutations |
| Lifetime | deleted after 30 days, or when their doctor / patient is deleted |
| Demo data | `npm run seed` → 30 notifications over the last 7 days, 12 unread |

## State (Redux Toolkit)
- `ui` slice _(built in 3.1)_: `sidebarCollapsed`, `mobileNavOpen`, `theme`, `dialog` (`{ id, entityId? } | null`); actions `sidebarToggled`, `sidebarCollapsedSet`, `mobileNavSet`, `themeSet`, `dialogOpened`, `dialogClosed`
- `toast` slice _(built in 3.1)_: queue (max 4); use `const toast = useToast(); toast.success(title, description?)` / `.error` / `.info`
- `auth` slice _(built in 3.2)_: `user` (`PublicUser | null`), filled by `<AuthHydrator>` from the server; `selectUser`
- Store created per request (`StoreProvider`); typed `useAppDispatch` / `useAppSelector` from `@/store/hooks`.
- Filter **drafts** live in local component state; **applied** filters live in the URL. Server data is never copied into Redux.

## Design system — slate + indigo / violet (built in 3.1, redesigned 2026-11-15)
- Tokens in `globals.css` (full table in module 3.1 `context.md`): `paper` / `paper-2` / `surface`, `ink` / `ink-muted` / `ink-subtle`, `line` / `line-strong`, `accent` (+ `-hover`, `-soft`, `-ink`), **`accent-fg`** (accent as text/icon — use it instead of `text-accent`), `accent-2` (violet, brand gradient), `danger` / `warning` / `success` / `info` (+ `-soft`), `overlay`. Dark theme via `data-theme="dark"` on `<html>`; `dark:` utilities follow it. All text pairs WCAG AA; `ink-subtle` is for placeholders/icons only.
- Type: **Plus Jakarta Sans** (variable, `--font-jakarta`; replaced Inter on 2026-11-15 at the user's request) for UI, JetBrains Mono for codes/IDs, `tabular-nums` in tables/KPIs, clocks and counts; `text-title` (22px) for large headings (pages have no visible title), `text-label` (11px uppercase) for section labels; body 14px, inputs 16px on phones.
- Shape: `rounded-control` (8px), `rounded-panel` (12px); `shadow-card` on cards / tables / secondary buttons, `shadow-overlay` on dialogs, popovers, toasts. Panels use `<Card>` (`components/ui/card.tsx`). Badges are pills (`rounded-full`, soft fill + inset ring).
- Layout: content is full width (no max-width cap) with 16px / 24px side padding; white sidebar and top bar on a slate-50 page.
- Sizes: 36px controls with a mouse, 44px on touch (`pointer-coarse:`).
- Motion: 150–250 ms, `ease-clinical`; row stagger on new data, dialog/popover lift, toast slide; `reducedMotion="user"`. Planned: sidebar `layoutId` indicator (3.2), number count-up (4.3).
- Avoid: emoji icons, decorative pills/badges for marketing copy, slogan-style text (the user prefers plain wording), glassmorphism. Gradients only for the logo mark and photo overlays.

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
| `Popover` | `trigger={(props) => <button {...props} />}`, children or `({ close }) => …`, `label`, `initialFocus: "first" | "panel"` (focus the panel itself when its first control is an action) |
| `FormAlert` | form-level error box (`role=alert`), e.g. an API error that isn't tied to one field |
| `Dialog` | `open`, `onClose`, `title`, `description`, `footer`, `size`, `dismissible` (false while saving), `initialFocusRef`. Bottom sheet on phones. A footer submit button targets a body form with `form="<id>"` |
| `ConfirmDialog` | `onConfirm` may be async (spinner, not dismissible meanwhile); focus starts on Cancel; caller closes on success |
| `Toaster` | mounted once in providers; use `useToast()` |
| `DataTable` | `columns: Column<T>[]` (`header`, `cell`, `align`, `sort: { asc, desc, first? }`, `mobile: title · meta · field · hidden`, `className` (also hides a column per breakpoint, e.g. `hidden xl:table-cell`), `skeleton` (loading cell with the real cell's box)), `fill` (laptops: take the remaining height, scroll inside, sticky header), `rows`, `getRowId`, `caption`, `sort` + `sortHref` (URL) or `onSortChange`, `rowActions`, `loading`, `empty` |
| `Pagination` | `page`, `totalPages`, `total`, `limit`, `hrefForPage` (URL) or `onPageChange`, `onLimitChange` (10 · 20 · 50) |
| `SearchInput` | `onSearch` debounced 300 ms (Enter = now, Escape = clear), `defaultValue`, `label`, `pending`; re-key to reset from outside |
| `DateRangeField` | `value: { from?, to? }` (YYYY-MM-DD, inclusive), `onChange`, `label`; presets (last 7 / 30 / 90 days, 12 months, this year, last year) counted from today in Dhaka |
| `icons.tsx` | hand-drawn 24×24 stroke icons (`size`, decorative by default) |

## App shell (built in 3.2)
```
app/layout.tsx            fonts, pre-paint theme/sidebar script, <Providers> (store, motion, toasts, #app-root)
├── (auth)/login          static sign-in page
└── (app)/layout.tsx      skip link · <Sidebar> · <Topbar userSlot={<Suspense><CurrentUserMenu/></Suspense>}> · <main> · <MobileNav>
                          Topbar = breadcrumb | <WorldClock> <NotificationBell> <ThemeToggle> | account menu
    ├── loading.tsx       in-shell skeleton, shaped like title + card (Suspense boundary for pages)
    ├── error.tsx         in-shell error with retry()
    └── dashboard · doctors · patients
```
- New pages go under `app/(app)/…`, start with `<PageHeader title actions>` (title is screen-reader only), and fetch data in Server Components inside the route's `loading.tsx` boundary (or their own `<Suspense>`).
- Layout components: `components/layout/` (sidebar, topbar, mobile-nav, user-menu, theme-toggle, page-header, page-skeleton, brand, nav-items). Nav entries live in `nav-items.ts`.
- Top bar items (all fixed-size boxes, so nothing shifts while they fill in):
  - `features/clock/world-clock.tsx`: main clock (Asia/Dhaka by default) → panel with a read-only month calendar (Sunday first, always 6 weeks) and the user's time zones (add by searching any IANA zone, star = main clock, remove; max 6; saved per browser in `localStorage["dt-clocks"]`). Time comes from `useNow("minute" | "second")` (`hooks/use-now.ts`), which is `null` on the server and during hydration: render a same-sized placeholder for that pass.
  - `features/notifications/notification-bell.tsx`: loads `GET /api/notifications?limit=20` after hydration, every 60 s while the tab is visible, on tab focus and on `refreshNotifications()`. 18px count circle ("9+" above nine); slow ping + one bell swing while something new hasn't been seen (`localStorage["dt-notifications-seen"]`); clicking an item marks it read and opens it (doctor → `/doctors/:id`, patient → `/patients?search=<name>`); "Mark all as read".
- Sizing: content is full width (no max-width cap). From `lg` the content column is `h-dvh` with the top bar fixed in it and `<main>` as the only scroll container; below `lg` the window scrolls (`scrollbar-gutter: stable` so dialogs locking the scroll don't shift the page).
- Preferences: `applyTheme` / `applySidebarCollapsed` (`lib/preferences.ts`) write localStorage + the `<html>` attribute; use `dark:` / `sidebar-collapsed:` variants for anything visual.

## Component tree
### Doctors (built in 4.1)
```
app/(app)/doctors/page.tsx          server: parseDoctorParams → getDoctors + getHospitals → <DoctorsView>
app/(app)/doctors/loading.tsx       <DoctorsListSkeleton> (the real DataTable in loading mode)
app/(app)/doctors/[id]/page.tsx     server: getDoctor + getDoctorPatients + getDoctorPatientCounts + getHospitals (parallel)
app/(app)/doctors/[id]/loading.tsx  <DoctorProfileSkeleton> + <DoctorPatientsSkeleton>
app/(app)/doctors/[id]/not-found.tsx
features/doctors/
  types.ts · params.ts (parse / query / href / filter count) · schema.ts (form) · server.ts (reads) · client.ts (writes)
  components/doctors-view.tsx         toolbar · filter tokens · DataTable (DOCTOR_COLUMNS) · Pagination · dialogs
  components/doctor-filters-dialog.tsx · doctor-form-dialog.tsx · delete-doctor-dialog.tsx
  components/doctor-profile.tsx       profile card + stat tiles (+ skeleton)
  components/doctor-patients-view.tsx the doctor's patients (PATIENT_COLUMNS, + skeleton)
features/patients/
  types.ts · params.ts · schema.ts · client.ts
  components/patient-form-dialog.tsx  (doctor preset; 4.2 adds a doctor picker) · delete-patient-dialog.tsx
lib/list-params.ts                  readString / readEnum / readInt / readDate / readPaging / orderedRange
components/layout/breadcrumb-tail.tsx   detail pages add their name to the top bar breadcrumb
```
- **List page recipe:** parse params on the server → fetch in parallel → client view gets data + params → `navigate(patch)` = `router.replace(href(params, patch), { scroll: false })` in `startTransition`; dim the table with `isPending`; redirect a page past the end to the last page.
- **Never key a search box by its own text** (it remounts and loses focus as results land); key it by a counter bumped by outside "clear" actions.
- **Screen-fitting tables:** the page root is `flex flex-col lg:min-h-0 lg:flex-1`, the table wrapper `flex min-h-0 flex-col`, and `<DataTable fill>`.
