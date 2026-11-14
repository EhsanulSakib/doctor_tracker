# Milestone 3 — Frontend Foundation: Context

## Goal
A Next.js 16 app with the custom design system, data-fetching layer, Redux store, working login/logout, route protection with silent session refresh, and the responsive app shell.

## Relevant decisions
#2 auth · #9 data layer · #10 UI · #11 security

## Frontend folder structure (target)
```
frontend/
├── src/
│   ├── proxy.ts                      # Next 16 replacement for middleware.ts: guard + refresh
│   ├── app/
│   │   ├── layout.tsx                # fonts, theme no-flash script, StoreProvider, Toaster
│   │   ├── globals.css               # Tailwind 4 @theme tokens (light + dark)
│   │   ├── (auth)/login/page.tsx
│   │   ├── (app)/layout.tsx          # protected shell; fetches current user server-side
│   │   ├── (app)/dashboard/…  (app)/doctors/…  (app)/patients/…
│   │   ├── error.tsx  not-found.tsx
│   ├── components/
│   │   ├── ui/                       # hand-built primitives
│   │   └── layout/                   # Sidebar, Topbar, MobileNav, PageHeader
│   ├── features/{auth,doctors,patients,dashboard}/   # feature components, api calls, schemas
│   ├── lib/
│   │   ├── api/ server-fetch.ts, client-fetch.ts, errors.ts, types.ts
│   │   ├── constants.ts              # enums mirrored from backend
│   │   ├── motion.ts                 # shared variants / transitions
│   │   └── utils.ts                  # cn(), formatters, query-string helpers
│   ├── hooks/ use-query-params.ts, use-debounce.ts
│   └── store/ store.ts, provider.tsx, hooks.ts, slices/{ui,auth,toast}.ts
```

## Dependencies / versions (checked 2026-11-14)
next 16.4 · react 19.3 · tailwindcss 4.3 · motion 14 (Framer Motion's current package name; import from `motion/react`) · @reduxjs/toolkit 2.14 + react-redux 9 · react-hook-form 7 + @hookform/resolvers + zod 4 · recharts 3 · jose 6 (decode JWT `exp` in proxy) · clsx.

## Assumptions / notes
- **Next 16 renamed `middleware.ts` to `proxy.ts`.** Confirm against the installed version's docs during scaffolding.
- `next.config.ts` rewrites `/api/:path*` → `${BACKEND_URL}/api/:path*`, so browser calls are same-origin and the httpOnly cookies are first-party.
- Server-side fetches call `BACKEND_URL` directly, with a `Cookie` header built from `cookies()`.
- Redux store is created per request (`useRef` in `StoreProvider`), the App Router-safe pattern.
- Enums are duplicated in `lib/constants.ts` (no shared package, per decision #1).
