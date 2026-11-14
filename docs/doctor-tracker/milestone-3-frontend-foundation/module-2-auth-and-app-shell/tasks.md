# Module 3.2 — Auth + App Shell: Tasks

- [ ] [frontend] `src/proxy.ts`: matcher (exclude `/api`, `_next`, static files); no refresh cookie → redirect `/login?next=`; access token missing or expiring in < 30 s → call backend refresh, forward rotated cookies on the request and the response; refresh failure → clear cookies + redirect; `/login` with a valid session → `/dashboard`
- [ ] [frontend] Login page: split layout (brand panel + form), React Hook Form + Zod, inline errors, 401/429 messages, submit loading, entrance motion, `next` param redirect (same-origin paths only)
- [ ] [frontend] `(app)/layout.tsx`: server-side `GET /api/auth/me` → hydrate the `auth` slice; logout action (POST logout → redirect `/login`)
- [ ] [frontend] Sidebar: Dashboard / Doctors / Patients, collapsible (persisted), active indicator with `layoutId`, keyboard accessible
- [ ] [frontend] Topbar: page title / breadcrumb slot, theme toggle, user menu (name, email, logout); MobileNav drawer under `md`
- [ ] [frontend] Theme: inline no-flash script reading `localStorage`, `data-theme` on `<html>`, toggle synced with the `ui` slice
- [ ] [frontend] `error.tsx`, `not-found.tsx`, root `loading.tsx` styled to the design system
- [ ] [test] Manual: protected URL while logged out → `/login`; wrong password message; login → dashboard; set `ACCESS_TOKEN_TTL=20s` and confirm silent refresh on navigation; logout → protected URL redirects again; mobile layout check
- [ ] [test] `typecheck`, `lint`, `build` pass
