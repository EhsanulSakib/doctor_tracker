# Module 3.2 — Auth + App Shell: Tasks

- [x] [frontend] `src/proxy.ts`: matcher (excludes `/api/`, `_next/`, files with an extension, and prefetch requests via `missing`); no refresh cookie → redirect `/login?next=`; access token missing or expiring in < 30 s → backend refresh, rotated cookies forwarded on the request (this render) and the response (browser); refresh 401 → clear cookies + redirect; API unreachable → pass through (no sign-out); `/login` with a valid session → `?next=` or `/dashboard`
- [x] [frontend] Login page: split layout (teal brand panel with ruled-ledger pattern + form), React Hook Form + Zod, inline errors with live re-validation, 401 / 429 / network messages in an alert, password selected after a wrong attempt, show/hide password, submit loading, CSS entrance animation, `next` redirect (same-site paths only, `safeNextPath`)
- [x] [frontend] `(app)/layout.tsx`: server-side `GET /api/auth/me` inside `<Suspense>` (static shell, streamed account menu) → `AuthHydrator` fills the `auth` slice; logout (POST logout → full reload to `/login`); menu degrades to a fallback (Sign out still works) if the API is down
- [x] [frontend] Sidebar: Dashboard / Doctors / Patients, collapsible (persisted, applied before paint), active indicator with `layoutId`, `aria-current`, keyboard accessible; icon rail on tablets
- [x] [frontend] Topbar: breadcrumb, theme toggle, account menu (name, email, role, sign out); MobileNav drawer under `md` (new `Drawer` primitive; closes on navigation)
- [x] [frontend] Theme: inline no-flash script (localStorage, falls back to the OS scheme), `data-theme` on `<html>`, toggle synced with the `ui` slice
- [x] [frontend] `error.tsx` (root + in-shell, with `retry`), `not-found.tsx`, `loading.tsx` (root spinner + in-shell skeleton) styled to the design system
- [x] [frontend] `/` → `/dashboard` (config redirect); placeholder Dashboard / Doctors / Patients pages (milestone 4 replaces them); skip link
- [x] [test] Automated end-to-end auth run (22 checks) against the production build + real API with 40 s access tokens: redirects + `next`, open-redirect guard, login, fresh token = no refresh, missing / expiring token = refresh before render, prefetch = no refresh, logout, revoked / garbage tokens, API outage
- [x] [test] Real-browser run (26 checks, headless Chrome via DevTools protocol): login validation and errors, return to the requested page, navigation, account menu, theme + sidebar persistence across reloads, tablet rail, phone drawer, sign out; screenshots in both themes
- [x] [test] `typecheck`, `lint`, `build` pass
