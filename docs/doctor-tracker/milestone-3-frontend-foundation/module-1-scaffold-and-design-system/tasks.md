# Module 3.1 — Scaffold + Design System: Tasks

- [x] [config] `create-next-app@16.4.5` (TypeScript, App Router, `src/`, Tailwind, ESLint, React Compiler, `--empty`) in `frontend/`; versions pinned (runtime deps exact); `server-only` added
- [x] [config] `next.config.ts`: `/api` rewrite to `BACKEND_URL`, security headers (X-Frame-Options, CSP `frame-ancestors 'none'`, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), `poweredByHeader: false`; keeps the scaffold's `cacheComponents` + `partialPrefetching` + `reactCompiler`; `.env.example`
- [x] [frontend] `globals.css` design tokens (paper / ink / teal / hairline / semantic states) for light and dark, contrast-checked; IBM Plex Sans + Mono via `next/font`; `focus-ring` utility; reduced-motion CSS; tabular numerals via Tailwind's `tabular-nums`
- [x] [frontend] `lib/api`: `ApiError` (+ `fieldErrors`), typed `serverFetch` (access-token cookie forwarding, `no-store`, 401 → /login backstop), typed `clientFetch` (same-origin, single-flight refresh on 401 + retry once, full redirect to `/login?next=` on failure)
- [x] [frontend] Redux: `combineSlices` store factory, `StoreProvider` (one store per request), typed hooks, `ui` slice (sidebar, mobile nav, theme, dialog), `toast` slice (+ `useToast`)
- [x] [frontend] Primitives 1: Button (variants, sizes, loading, `buttonStyles` for links), IconButton (required label), Input, Textarea, Field (label / hint / error wiring), Badge, Spinner, Skeleton
- [x] [frontend] Primitives 2: Select (custom listbox, select-only combobox pattern, type-ahead), Popover, Dialog (bottom sheet on phones) + ConfirmDialog (portal, focus trap, Esc, inert app root, scroll lock, motion), Toaster (live regions, pause on hover)
- [x] [frontend] Primitives 3: DataTable (typed columns, sortable headers with `aria-sort`, row stagger, card layout on mobile, skeleton + empty states), Pagination (numbered with gaps, links or callbacks, page size), SearchInput (debounced), DateRangeField (presets + two date inputs in a popover), EmptyState
- [x] [frontend] `lib/motion.ts` shared variants; `LazyMotion` (features loaded after first paint) + `MotionConfig reducedMotion="user"`
- [x] [frontend] Bangladesh conventions (user request): day-first dates, 12-hour time, lakh digit grouping (`en-IN` formatting), Asia/Dhaka "today", `+880` phone placeholder, `lang="en-BD"`
- [x] [test] Temporary `/kit` page rendering every primitive in both themes; screenshots (desktop + emulated 390px phone, light + dark, dialog / toast / select / popover states) and a scripted keyboard check, then deleted
- [x] [test] `typecheck`, `lint`, `build` pass
