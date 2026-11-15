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
- Desktop ≥ 1024px: 240px sidebar, collapsible to a 64px rail (saved in localStorage, applied before paint through `data-sidebar` on `<html>` and a `sidebar-collapsed:` variant). Content max-width 1280px.
- Tablet 768–1023px: always the 64px icon rail (labels as screen-reader text + tooltips).
- Phone < 768px: top bar (menu button, brand, theme, account) + slide-in drawer (`Drawer` primitive: inert app, focus trap, Escape, closes on navigation).
- Skip link to `<main id="main">`; `<nav aria-label="Main">`; `aria-current="page"` on the active link; breadcrumb from `md`.

## Data flow
- `(app)/layout.tsx` is static. `<CurrentUserMenu>` (Server Component) sits in `<Suspense>`, calls `getCurrentUser()` (React `cache` → one `/auth/me` per request), renders the menu and `<AuthHydrator>` (puts the user in the `auth` slice for client components such as the mobile drawer).
- `/auth/me` failing for any reason but a dead session → fallback menu (Sign out still works). `unstable_rethrow` lets Next's redirect (401) and prerender bail-outs through.
- Login: `clientFetch('/auth/login')` → `userLoaded` → `router.replace(safeNextPath(?next))`. Logout: `clientFetch('/auth/logout')` → full reload to `/login` (drops all client state).

## Theme
Inline script in `<head>` (before paint): `localStorage['dt-theme']` → else OS `prefers-color-scheme` → `data-theme` on `<html>`. The toggle writes both; its icon is picked by CSS (`dark:`), so there's never a hydration mismatch. `PreferencesSync` copies theme/sidebar into Redux after hydration.

## Login page
Left (from `lg`): teal brand panel with a ruled-ledger CSS pattern, wordmark, value statement, three highlights, Bangladeshi cities. Right: form. Phones: only the form, wordmark above. Entrance animation is pure CSS (`animate-rise`), so the form is visible before JavaScript loads. Demo credentials are not printed on the page (README).

## Implementation notes / changes from plan
- Prefetch exclusion moved into the matcher (the header-based check can't work inside the proxy); found by the end-to-end run.
- API outage handling (proxy passes through; menu fallback) added beyond the plan.
- `Drawer` primitive and shared `components/ui/modal.ts` (app lock + focus trap) added; Dialog refactored onto it.
- `error.tsx` uses Next 16.4's `retry()` prop (re-fetches the segment) rather than `reset()`.
- `?next=` is read at submit time from `window.location`, so the login page needs no `useSearchParams` / Suspense and stays fully static.
- `ACCESS_TOKEN_TTL=20s` from the plan became 40 s in testing: with a 30 s refresh margin, a 20 s token would refresh on every request and the "fresh token" path couldn't be tested.
