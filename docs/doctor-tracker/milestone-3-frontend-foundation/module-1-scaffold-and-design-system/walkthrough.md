# Module 3.1 — Scaffold + Design System: Walkthrough

> A guide to every file this module created, the ideas behind it, and how it was verified.
> Status: **done** (2026-11-15) · typecheck, lint and production build clean · visual + keyboard check on the production build.

## What this module built
- **The Next.js 16 app** in `frontend/`: App Router, TypeScript, Tailwind CSS 4, React Compiler, Cache Components, `/api` proxy to Express, security headers.
- **The "Clinical ledger" design system**: colour, type, radius, shadow and motion tokens for light and dark themes, contrast-checked.
- **17 hand-built UI primitives** (no component library): Button, IconButton, Input, Textarea, Field, Badge, Spinner, Skeleton, Select, Popover, Dialog, ConfirmDialog, Toaster, DataTable, Pagination, SearchInput, DateRangeField, EmptyState, plus an SVG icon set.
- **The data layer**: `serverFetch` (Server Components) and `clientFetch` (browser, with silent session refresh), typed `ApiError`.
- **Redux Toolkit store** for UI state (sidebar, theme, dialogs, toasts).
- **Bangladesh conventions**: day-first dates, 12-hour time, lakh grouping, Asia/Dhaka "today", `+880` numbers.

## Files
```
frontend/
├── next.config.ts                 rewrites /api → Express, security headers, cacheComponents, React Compiler
├── .env.example                   BACKEND_URL
├── package.json                   pinned versions; scripts dev / build / start / lint / typecheck
└── src/
    ├── app/
    │   ├── layout.tsx             fonts (IBM Plex via next/font), metadata, <Providers>
    │   ├── providers.tsx          Redux store, lazy motion engine, reduced-motion config, #app-root, <Toaster>
    │   ├── globals.css            design tokens (light + dark), base styles, focus-ring utility
    │   └── page.tsx               placeholder (3.2 makes / redirect to /dashboard)
    ├── components/ui/             the primitives (one file each) + icons.tsx + portal.tsx
    ├── hooks/
    │   ├── use-debounce.ts        stable debounced callback (flush / cancel)
    │   ├── use-anchored-position.ts  places floating panels next to their trigger
    │   ├── use-dismiss.ts         outside-click to close
    │   └── use-toast.ts           toast.success / error / info
    ├── lib/
    │   ├── api/                   server-fetch.ts, client-fetch.ts, errors.ts, types.ts
    │   ├── constants.ts           enums mirrored from the backend + labels + badge tones
    │   ├── motion.ts              shared transitions and variants
    │   ├── motion-features.ts     animation features, loaded lazily
    │   └── utils.ts               cn(), Bangladesh date/number formatting, query strings
    └── store/                     store.ts, provider.tsx, hooks.ts, slices/{ui,toast}.ts
```

## Suggested reading order
1. `next.config.ts`: how the browser reaches the API and which headers protect the app
2. `app/globals.css`: the token system (read the comments at the top)
3. `lib/utils.ts`: `cn()` and the Bangladesh formatting decisions
4. `components/ui/button.tsx`, `input.tsx`, `field.tsx`: the simple primitives and their conventions
5. `components/ui/portal.tsx` → `dialog.tsx` → `popover.tsx` → `select.tsx`: the overlay system
6. `components/ui/data-table.tsx`, `pagination.tsx`: list pages
7. `lib/api/*`: the fetch layer
8. `store/*`, `app/providers.tsx`, `app/layout.tsx`

---

## Key concepts in this module

### 1. Same-origin API through a rewrite
The browser never calls `localhost:8082` directly. It calls `/api/doctors` on the Next app, and `next.config.ts` rewrites that to Express. So the auth cookies (httpOnly, `SameSite=Lax`) are first-party, there are no CORS preflights, and the backend URL never appears in client code. Server Components skip the hop and call `BACKEND_URL` directly, forwarding only the access-token cookie.

### 2. Cache Components: a static shell plus streamed data
With `cacheComponents`, Next prerenders everything it can into a static shell at build time and streams request-time parts in behind `<Suspense>`. Reading cookies counts as request time, so **every component that calls `serverFetch` must sit inside `<Suspense>` or a route `loading.tsx`**; otherwise the build fails. The upside: the layout, navigation and skeletons appear instantly, and only the data waits. The build output shows every current route as `○ Static`.

### 3. Tokens, not colours
Components never use hex values or Tailwind's palette (`bg-teal-700`). They use semantic utilities such as `bg-surface`, `text-ink-muted`, `border-line` and `bg-accent`. These come from `@theme inline` in `globals.css`, which points at CSS variables, and `[data-theme="dark"]` swaps the variables. One attribute re-colours the whole app, and the palette lives in one place. Each text/background pair was chosen to meet WCAG AA (4.5:1). One example: white text on the dark-theme teal is under 3:1, so `accent-ink` is dark in dark mode.

`cn()` combines `clsx` with `tailwind-merge`, extended with the custom token names. Without that, `cn("text-ink", "text-label")` couldn't tell a colour from a font size, and a `className` override wouldn't replace the default.

### 4. Field: ARIA wiring done once
`<Field label hint error>` creates the ids and hands the control `id`, `aria-describedby` and `aria-invalid` through a render function: `{(p) => <Input {...p} />}`. Label clicks focus the input, screen readers read the hint or error with the field, and the same `aria-invalid` attribute that informs assistive tech also turns the border red (`aria-invalid:border-danger`). The custom Select isn't a native labelable element, so it gets the label's id as a second argument and uses `aria-labelledby`.

### 5. The overlay system
- **Portal:** every floating thing renders into `document.body`, outside `#app-root`. Parent `overflow: hidden` or transforms can't clip it, and stacking is a fixed scale: dialog 50, popover/listbox 60, toasts 70.
- **Dialog:** while open, `#app-root` gets the `inert` attribute, so the page behind can't be focused, clicked, or reached by a screen reader. Scroll is locked without layout shift (`scrollbar-gutter: stable`), Tab wraps inside, Escape closes, and focus returns to the button that opened it. On phones it's a bottom sheet, and touch screens focus the dialog instead of popping the keyboard. *Why not native `<dialog>`?* Its top layer would cover the portaled listboxes and toasts and make them inert.
- **Escape order:** React events bubble through portals, so an open Select inside a dialog handles Escape first and stops it. The first Escape closes the list, the second closes the dialog (verified).
- **Positioning** (`use-anchored-position`): the panel goes below the trigger, flips above when there's more room, and stays inside the viewport. It is re-measured on any scroll or resize, and the hook writes `top`/`left` straight to the element (no re-render per scroll frame).

### 6. Select, the accessible way
It follows the WAI-ARIA "select-only combobox" pattern. Focus never leaves the trigger, and the highlighted option is exposed with `aria-activedescendant`, which is why `onMouseDown` on options calls `preventDefault`. Keys: ↑/↓/Enter/Space open; arrows, Home/End and PageUp/PageDown move; Enter/Space choose; Escape/Tab close; typing jumps to a label (repeating one letter cycles through matches). Arrow handling uses functional updates (`setActive(i => i + 1)`), so fast key repeats never get lost.

### 7. DataTable: one component, two layouts
On `md` and up it's a semantic `<table>` with a hidden caption and sortable headers. They set `aria-sort` and can be links (`sortHref`, URL-driven) or buttons. On phones, a wide table would scroll sideways, so the same columns render as cards: a title, a meta line, and `label: value` fields, controlled per column with `mobile: 'title' | 'meta' | 'field' | 'hidden'`. Rows stagger in when a new page arrives, but **not on first paint**. Server-rendered rows must be visible before JavaScript loads, so `initial` stays `false` until hydration (`useIsClient`).

### 8. Accessible toasts
Toasts appear visually in a corner, but screen readers hear them through two `sr-only` live regions (polite, and assertive for errors) that exist **before** any toast. A live region inserted at the same moment as its text is often not announced. Errors stay 8 s, others 4–5 s, and the timer pauses while the toast is hovered or focused.

### 9. Silent session refresh in the browser (`clientFetch`)
On a 401 it calls `POST /api/auth/refresh` once and retries the request. If several requests fail together, they share one refresh promise (single-flight). That matters because the backend rotates the refresh token on every use. If the refresh fails, it does a full reload to `/login?next=<current page>`, dropping all client state.

### 10. Performance choices
- **React Compiler**: memoizes components automatically; no scattered `useMemo`/`memo`.
- **LazyMotion** with `m.*` components (strict): the animation engine loads after first paint, so the initial bundle stays small.
- **next/font**: IBM Plex is self-hosted at build time (no Google request from the browser) with `display: swap` and fallback metrics (no layout shift).
- Positioning writes to the DOM directly; debounced search; static rendering wherever possible.

### 11. Bangladesh formatting
Dates are day-first (`15 Nov 2026`), time is 12-hour, and numbers use lakh grouping (`12,34,567`). ICU's `en-BD` falls back to US conventions, so `en-IN`, which shares these South Asian conventions, is the formatting locale. "Today" is computed in Asia/Dhaka. Date-only values are formatted in UTC because they're stored as UTC midnight, which means they never shift a day.

---

## Verification
- `npm run typecheck`, `npm run lint`, `next build`: clean.
- `curl -I`: all five security headers, no `X-Powered-By`.
- Temporary `/kit` page on the production build, screenshotted with headless Chrome. Phones were emulated through the DevTools protocol, because a plain headless window can't be narrower than ~500px on Windows:
  - desktop light/dark: all primitives consistent in both themes;
  - phone 390px: everything stacks; the table becomes cards; `scrollWidth === 390` (no sideways scroll);
  - dialog (desktop panel, phone bottom sheet), stacked toasts, open listbox, date-range popover on desktop and phone.
- Scripted keyboard run (Select + Dialog): all behaviours listed in concept 6 and the Escape order in concept 5.
- `/kit` deleted afterwards.

## Problems found and fixed
| Problem | Fix |
|---|---|
| Phone numbers and dates wrapped inside table cells | `whitespace-nowrap` for numeric columns and those cells |
| Date-range trigger stretched across the filter bar | full width only on phones (`sm:w-auto`) |
| Two fast Arrow-Down presses moved the highlight once | functional state updates |
| Dialogs on phones focused the first text field (keyboard covered the sheet) | touch screens focus the dialog itself |
| React Compiler lint: `close()` read a ref during render (Popover) | trigger focused by id instead |
| ESLint 10 broke plugin peer ranges | stay on ESLint 9 |

## Checkpoint summary
- Next.js 16 app scaffolded with the Clinical-ledger design system, 17 accessible primitives, fetch layer, Redux UI store, Bangladesh formatting.
- Typecheck, lint and build clean; visual check in both themes on desktop and phone; keyboard behaviour verified.
- Next: **3.2 Auth + app shell** (proxy.ts session refresh, login page, sidebar/topbar, theme toggle).
