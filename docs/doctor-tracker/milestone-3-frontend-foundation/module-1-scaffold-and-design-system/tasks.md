# Module 3.1 — Scaffold + Design System: Tasks

- [ ] [config] `create-next-app` (TypeScript, App Router, `src/`, Tailwind, ESLint) in `frontend/`; strip boilerplate
- [ ] [config] `next.config.ts`: `/api` rewrite to `BACKEND_URL`, security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), `poweredByHeader: false`; `.env.example`
- [ ] [frontend] `globals.css` design tokens (paper / ink / teal / hairline / semantic states) for light and dark; IBM Plex Sans + Mono via `next/font`; tabular numerals utility
- [ ] [frontend] `lib/api`: `ApiError`, typed `serverFetch` (cookie forwarding, `cache: 'no-store'`), typed `clientFetch` (same-origin, single-flight refresh on 401 + retry once, redirect to `/login` on failure)
- [ ] [frontend] Redux: store factory, `StoreProvider`, typed hooks, `ui` slice (sidebar, theme, dialog), `toast` slice
- [ ] [frontend] Primitives 1: Button (variants, loading), IconButton, Input, Textarea, Field (label / hint / error), Badge, Spinner, Skeleton
- [ ] [frontend] Primitives 2: Select (custom listbox, keyboard nav, ARIA), Popover, Dialog + ConfirmDialog (portal, focus trap, Esc, scroll lock, motion), Toaster
- [ ] [frontend] Primitives 3: DataTable (typed columns, row stagger, card layout on mobile), Pagination, SearchInput (debounced), DateRangeField (presets + two date inputs in a popover), EmptyState
- [ ] [frontend] `lib/motion.ts` shared variants; honour `useReducedMotion`
- [ ] [test] Temporary `/kit` page rendering every primitive in both themes; screenshot check, then delete it
- [ ] [test] `typecheck`, `lint`, `build` pass
