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
