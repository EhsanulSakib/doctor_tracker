# Module 3.2 — Auth + App Shell: Context

## proxy.ts flow
```
request (page route; prefetches and /api/* skip the proxy via the matcher)
  ├─ access token valid for > 30 s
  │    ├─ /login → redirect to ?next= (same-site only) or /dashboard
  │    └─ otherwise continue
  ├─ no dt_refresh
  │    ├─ /login → continue
  │    └─ otherwise → redirect /login?next=<path>   (no ?next for / and /dashboard)
  └─ access token missing / expiring / malformed → POST {BACKEND_URL}/api/auth/refresh with the refresh cookie
       ├─ 200 → copy Set-Cookie to the response unchanged; rewrite this request's Cookie header so
       │        Server Components in THIS request see the new access token (/login → redirect onward)
       ├─ 401 → delete both cookies, redirect /login?next=<path>
       └─ network error / 429 / 5xx → continue (don't sign the user out over a hiccup)
```
- `exp` is read with `jose.decodeJwt` (no secret on the frontend). The proxy only decides *when* to refresh; the backend still verifies every request.
- The access cookie's Max-Age equals the token TTL, so after expiry the browser usually drops it: "missing" is the common case, handled like "expired".
- **Prefetches skip the proxy** (`missing` in the matcher). Next strips `next-router-prefetch` from `request.headers` inside the proxy, so it can only be excluded there. Safe because Partial Prefetching only fetches the static shell, which holds no user data.
- Several refreshes racing with the same token are fine: the backend accepts a just-rotated token for 10 s.
- `next` is accepted only if it's a same-site path (`safeNextPath`: must start with `/`, not `//` or `/\`, same origin after URL parsing, never `/login`).

## Routes
| Route | Rendering | Notes |
|---|---|---|
| `/` | config redirect | → `/dashboard` (before the proxy runs) |
| `/login` | static | split layout; signed-in visitors are redirected by the proxy |
| `/dashboard`, `/doctors`, `/patients` | partial prerender | static shell + streamed account menu; placeholder content until milestone 4 |
| unknown | `not-found.tsx` | |

## Shell layout
- Desktop ≥ 1024px: 240px sidebar, collapsible to a 64px rail (saved in localStorage, applied before paint through `data-sidebar` on `<html>` and a `sidebar-collapsed:` variant). Content is full width (the 1280px cap was removed in the redesign).
- Laptop and up (≥ 1024px): the shell is exactly one viewport tall (`lg:h-dvh`), so the window never shows a scrollbar; `<main>` is the only scroll container (thin scrollbar) if a page is ever taller than the screen. No `scrollbar-gutter` there, so no empty strip on the right. Below 1024px the window scrolls normally (with a stable gutter).
- Tablet 768–1023px: always the 64px icon rail (labels as screen-reader text + tooltips).
- Phone < 768px: top bar (menu button, page name, clock icon, bell, theme, account) + slide-in drawer (`Drawer` primitive: inert app, focus trap, Escape, closes on navigation).
- Skip link to `<main id="main">`; `<nav aria-label="Main">`; `aria-current="page"` on the active link; breadcrumb from `md`.
- Loading states keep the real geometry (no layout shift): `loading.tsx` = `EmptyCardSkeleton` (same box as `<Card><EmptyState/></Card>`; there is no title row, see below); the account button is a fixed box (36px icon on phones, 176px from `sm`) shared by the real menu, its fallback and its skeleton (`TRIGGER_BOX` in `user-menu.tsx`), so the streamed name never pushes the theme toggle.

## Top bar (redesigned 2026-11-15, user feedback)
The user asked for: no title above the page content (the breadcrumb is enough), smaller and more professional text, a notification bell with a count that keeps its round shape, and a clock with date and calendar in Bangladesh time that can show other time zones.
- **Titles:** breadcrumb `Doctor Tracker › Section` at 13px (from `md`); on phones the section name sits next to the menu button. Pages keep one `<h1>`, visually hidden (`PageHeader`). App font switched from Inter to **Plus Jakarta Sans**.
- **Clock** (`features/clock`): `11:57 AM | Sun, 15 Nov · Dhaka` from `xl`, time + date from `lg`, time from `sm`, an icon on phones. Each breakpoint has a fixed box, so the time filling in after hydration (`useNow` returns `null` on the server) and "9:59" → "10:00" never move the neighbours. The panel (`Popover`, two columns from `md`) shows the time with seconds, a read-only month calendar (6 weeks, Sunday first per CLDR `en-BD`, Today button) and the time-zone list: main clock first (star), others with "6h behind / 3h ahead" and Yesterday / Tomorrow, star to make one the main clock, × to remove, "Add time zone" → an editable combobox (APG pattern; arrow keys, Enter, Escape closes only the search) over every zone `Intl.supportedValuesOf("timeZone")` knows, matched by city, region or zone name ("Bangladesh Standard Time"). Up to 6 zones, saved per browser (`dt-clocks`, synced across tabs via the `storage` event); invalid saved zones are dropped.
- **Bell** (`features/notifications`, backend 2.4): fetched client-side after hydration so the static shell stays static; polls every minute only while the tab is visible. Badge: an 18px circle with `9+` above nine, positioned absolutely (never resizes the button) with a 2px ring in the bar colour. While there is an unread notification newer than the last one seen, a slow halo pings and the bell swings once per new arrival; opening the panel marks them seen (count stays until read). Panel: latest 20, unread rows tinted with a dot, type icon (new patient, recovered, moved, new doctor, doctor away), plain relative times in Dhaka time ("12 min ago", "Yesterday, 4:30 PM"); click = mark read + open; "Mark all as read" (optimistic, rolled back with a toast on failure); loading / empty / error-with-retry states. Focus goes to the panel itself on open, not to "Mark all as read".

## Data flow
- `(app)/layout.tsx` is static. `<CurrentUserMenu>` (Server Component) sits in `<Suspense>`, calls `getCurrentUser()` (React `cache` → one `/auth/me` per request), renders the menu and `<AuthHydrator>` (puts the user in the `auth` slice for client components such as the mobile drawer).
- `/auth/me` failing for any reason but a dead session → fallback menu (Sign out still works). `unstable_rethrow` lets Next's redirect (401) and prerender bail-outs through.
- Login: `clientFetch('/auth/login')` → `userLoaded` → `router.replace(safeNextPath(?next))`. Logout: `clientFetch('/auth/logout')` → full reload to `/login` (drops all client state).

## Theme
Inline script in `<head>` (before paint): `localStorage['dt-theme']` → else OS `prefers-color-scheme` → `data-theme` on `<html>`. The toggle writes both; its icon is picked by CSS (`dark:`), so there's never a hydration mismatch. `PreferencesSync` copies theme/sidebar into Redux after hydration.

## Login page (redesigned 2026-11-15, user feedback)
Left (from `lg`): full-height photo of a doctor working at a laptop (Vitaly Gariev, Unsplash License: free, no attribution required; credited here and in the code only). A deep-indigo gradient at the bottom carries a plain heading and four bullet points; the right edge fades into the form side's background (`to-surface`) so the two halves blend in both themes. No pills, no slogans, no visible credit.
Image optimisation: stored as a 1280×1600 portrait crop (206 KB, cropped on Unsplash's CDN so a tall panel wastes no pixels); `next/image` with `placeholder="blur"`, `fetchPriority="high"`, `sizes` per breakpoint, and `images.formats: [avif, webp]` → measured **36 KB AVIF** on a 1920px desktop; phones (panel hidden) fetch a ~10 KB variant.
Right: "Sign in" form. Phones: only the form, wordmark above. Entrance animation is pure CSS (`animate-rise`). Demo credentials are not printed on the page (README).

## Implementation notes / changes from plan
- Prefetch exclusion moved into the matcher (the header-based check can't work inside the proxy); found by the end-to-end run.
- API outage handling (proxy passes through; menu fallback) added beyond the plan.
- `Drawer` primitive and shared `components/ui/modal.ts` (app lock + focus trap) added; Dialog refactored onto it.
- `error.tsx` uses Next 16.4's `retry()` prop (re-fetches the segment) rather than `reset()`.
- `?next=` is read at submit time from `window.location`, so the login page needs no `useSearchParams` / Suspense and stays fully static.
- `ACCESS_TOKEN_TTL=20s` from the plan became 40 s in testing: with a 30 s refresh margin, a 20 s token would refresh on every request and the "fresh token" path couldn't be tested.
