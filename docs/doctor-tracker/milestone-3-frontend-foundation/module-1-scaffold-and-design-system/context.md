# Module 3.1 — Scaffold + Design System: Context

## Versions (installed 2026-11-15)
Policy: the newest release that has been out for at least a week (brand-new patches are the likeliest to be pulled or broken). Runtime dependencies are pinned exactly.

| Package | Version | Note |
|---|---|---|
| next / eslint-config-next | 16.4.5 | 16.4.6 was 6 days old |
| react / react-dom | 19.3.1 | |
| tailwindcss / @tailwindcss/turbopack | 4.3.5 | Next 16.4 compiles Tailwind through a Turbopack loader (no PostCSS config) |
| motion | 14.10.1 | import from `motion/react`; 14.11+ were < 7 days old |
| @reduxjs/toolkit / react-redux | 2.14.0 / 9.3.1 | |
| clsx / tailwind-merge | 2.1.1 / 3.7.0 | |
| babel-plugin-react-compiler | 1.0.0 | `reactCompiler: true` |
| typescript | ~5.9.3 | TypeScript 7 (native compiler) not used yet |
| eslint | 9.x | ESLint 10 breaks peer ranges of plugins inside eslint-config-next |
| server-only | 0.0.1 | |

Form, chart and JWT libraries (react-hook-form, recharts, jose) come with the modules that need them.

## Next.js configuration
| Setting | Why |
|---|---|
| `cacheComponents: true` | Next 16 caching model (scaffold default): static shell prerendered, request-time data streamed behind `<Suspense>`. **Rule:** anything reading `cookies()` (e.g. `serverFetch`) must sit inside `<Suspense>` or a route with `loading.tsx`, or the build fails. Keep session reads out of a layout's top level |
| `partialPrefetching: true` | links prefetch only the static part of a route; `prefetch={true}` per link for more |
| `reactCompiler: true` | automatic memoization: components re-render only when their inputs change, without hand-written `useMemo`/`memo` everywhere |
| `rewrites` `/api/:path*` → `BACKEND_URL` | browser calls are same-origin, so the httpOnly `SameSite=Lax` cookies are first-party |
| `headers` | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `CSP: frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, mic, geolocation, payment, usb off) |
| `poweredByHeader: false` | |

Bundled docs for this exact version live in `frontend/node_modules/next/dist/docs/` (see `02-guides/authentication-with-cache-components.md` for module 3.2).

## Design tokens ("Clinical ledger")
| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#FAF9F6` | `#121417` | app background |
| `paper-2` | `#F2F0EB` | `#1C1F24` | hover / subtle fill, table header |
| `surface` | `#FFFFFF` | `#181B1F` | tables, cards, dialogs |
| `ink` | `#1C1F23` | `#E8E6E1` | primary text |
| `ink-muted` | `#5D6670` | `#9AA2AB` | secondary text |
| `ink-subtle` | `#757D86` | `#79818B` | placeholders, disabled |
| `line` / `line-strong` | `#E6E3DC` / `#D3CEC3` | `#2A2F35` / `#3B4149` | hairlines / input borders |
| `accent` (+ `-hover`, `-soft`, `-ink`) | `#0F6E6E` · ink `#FFF` | `#3BA6A6` · ink `#051615` | primary actions, focus, selection (white on the dark-theme teal is < 3:1, so dark text) |
| `danger` / `warning` / `success` / `info` (+ `-soft`) | `#B4372F` / `#8F6209` / `#2C7548` / `#2D5E8C` | `#EF8A80` / `#E2B257` / `#6CC08D` / `#7FB0E0` | statuses, destructive actions |
| `overlay` | ink at 36% | black at 60% | dialog backdrop |

Text/background pairs meet WCAG AA (4.5:1), including badge text on its soft background. Radius: `rounded-control` 6px, `rounded-panel` 10px. Shadow `shadow-overlay` only on dialogs, popovers, toasts. Ease `ease-clinical` = `cubic-bezier(0.2, 0.8, 0.2, 1)`. Type sizes: `text-label` (11px uppercase, tracked), `text-title` (22px). Theme switch: `data-theme="dark"` on `<html>`; `dark:` utilities follow it.

## Bangladesh conventions (user requirement, 2026-11-15)
| What | Choice |
|---|---|
| Dates | day first: `15 Nov 2026` |
| Time | 12-hour: `16 Nov 2026, 2:05 am` (Asia/Dhaka) |
| Numbers | lakh grouping: `12,34,567` |
| Formatting locale | `en-IN`: ICU's `en-BD` falls back to US conventions (`Nov 15, 2026`, `1,234,567`); `en-IN` has exactly the South Asian conventions above |
| "Today" | Asia/Dhaka (`todayIso()`), same as the API's `APP_TIMEZONE` |
| Date-only values | formatted in UTC (they're stored as UTC midnight), so they never shift a day |
| Phone placeholder | `+880 1712-345678` |
| `<html lang>` | `en-BD` |

## Primitive API conventions
- Small typed components; variants via `variant` / `size` props mapped to class strings; `className` overrides merge correctly (`cn()` = clsx + tailwind-merge taught the custom tokens).
- Every interactive element: keyboard operable, visible `focus-ring` (accent outline) or accent border + ring for fields, correct ARIA role.
- Touch: buttons / inputs are 36px with a mouse and 44px on touch screens (`pointer-coarse:`); inputs use 16px text on phones (no iOS zoom).
- Overlays render through `<Portal>` into `document.body` (outside `#app-root`); z-index: dialog 50 · popover/listbox 60 · toasts 70.
- Motion: 150–250 ms entrances, faster exits; `MotionConfig reducedMotion="user"` drops transforms and keeps fades; CSS animations are cut to ~0 ms under reduced motion.
- React 19 / React Compiler rules respected: no synchronous `setState` in effects, refs only read in effects and handlers (positioning writes straight to the DOM).

## Fetch layer contract
```ts
serverFetch<T>(path: string, init?: { searchParams?: QueryParams }): Promise<T>   // Server Components; throws ApiError; 401 → redirect('/login')
clientFetch<T>(path: string, init?: { method, body, searchParams, signal }): Promise<T>   // browser; throws ApiError
class ApiError extends Error { status; code; details?; get fieldErrors(): Record<string, string> }
```
`path` is relative to `/api` in both. `serverFetch` calls `BACKEND_URL` directly with only the `dt_access` cookie; `clientFetch` goes through the same-origin rewrite. Network failures become `ApiError(0, 'NETWORK_ERROR')`.

## Implementation notes / changes from plan
- `cacheComponents` and `partialPrefetching` were enabled by create-next-app 16.4 and kept (not in the original plan); data pages must use Suspense boundaries (planned anyway for skeletons).
- React Compiler enabled (not in the plan): satisfies "avoid unnecessary re-renders" without manual memoization.
- Icons are hand-drawn SVG components (`components/ui/icons.tsx`): no icon library, no emoji.
- Select / Popover / Dialog / Toaster are custom, built on WAI-ARIA patterns; a modal sets `inert` on `#app-root` for true background inertness instead of using the native `<dialog>` (the native top layer would hide portaled listboxes and toasts behind it, and make them inert).
- Phones: dialogs become bottom sheets; on touch screens the dialog itself gets focus instead of the first text field.
- Bangladesh formatting conventions added at the user's request.
