# Module 3.2 — Auth + App Shell: Walkthrough

> A guide to every file this module created or changed, the ideas behind it, and how it was verified.
> Status: **done** (2026-11-15) · end-to-end auth 22/22 · real-browser run 26/26 · typecheck, lint, build clean.

## What this module built
- **Route protection with silent session refresh** in `src/proxy.ts`: no session → `/login?next=…`; an expired or nearly expired access token is refreshed *before* the page renders, so users never see a flash of "signed out".
- **The sign-in page**: brand panel + form, validation, clear error messages, return to the page you asked for.
- **The app shell**: collapsible sidebar (icon rail on tablets), top bar with breadcrumb, theme toggle and account menu, phone drawer, skip link.
- **Theme and sidebar preferences** applied before the first paint (no flash, no layout jump).
- **Error, 404 and loading screens** in the design system; placeholder Dashboard / Doctors / Patients pages for milestone 4.

## Files
```
frontend/src/
├── proxy.ts                           guard + refresh before every page render
├── app/
│   ├── layout.tsx                     + pre-paint preferences script in <head>
│   ├── providers.tsx                  + PreferencesSync
│   ├── globals.css                    + sidebar-collapsed variant, animate-rise, ledger-lines
│   ├── error.tsx · not-found.tsx · loading.tsx         root-level screens
│   ├── (auth)/login/page.tsx          sign-in page (static)
│   └── (app)/
│       ├── layout.tsx                 the shell (static) + streamed account menu
│       ├── loading.tsx · error.tsx    in-shell skeleton / error with retry
│       └── dashboard · doctors · patients / page.tsx   placeholders
├── components/
│   ├── layout/                        sidebar, topbar, mobile-nav, user-menu, theme-toggle,
│   │                                  page-header, brand, nav-items, preferences-sync
│   └── ui/drawer.tsx · modal.ts       slide-in panel; shared app lock + focus trap (Dialog uses it too)
├── features/auth/
│   ├── login-form.tsx                 React Hook Form + Zod, error mapping, redirect
│   ├── current-user.ts                getCurrentUser() (server, cached per request)
│   ├── current-user-menu.tsx          streamed menu + fallback when the API is down
│   ├── auth-hydrator.tsx              user → Redux
│   └── logout.ts
├── lib/auth/session.ts                cookie names, paths, safeNextPath()
├── lib/preferences.ts                 theme / sidebar storage + the pre-paint script
└── store/slices/auth.ts               signed-in user
```
Changed: `next.config.ts` (`/` → `/dashboard`), `lib/api/server-fetch.ts` (shared constants), `components/ui/dialog.tsx` (uses `modal.ts`), `icons.tsx` (eye icons), `store/*` (auth slice), `package.json` (react-hook-form, @hookform/resolvers, zod, jose). Removed: the placeholder `app/page.tsx`.

## Suggested reading order
1. `src/proxy.ts`: read the comment block, then `proxy()` from the bottom up
2. `lib/auth/session.ts`: `safeNextPath` and why it exists
3. `app/(app)/layout.tsx` → `features/auth/current-user-menu.tsx` → `current-user.ts`
4. `features/auth/login-form.tsx` and `app/(auth)/login/page.tsx`
5. `lib/preferences.ts` → `app/layout.tsx` (the script) → `components/layout/sidebar.tsx` / `theme-toggle.tsx`
6. `components/layout/topbar.tsx`, `mobile-nav.tsx`, `components/ui/drawer.tsx`, `modal.ts`
7. `app/(app)/error.tsx`, `loading.tsx`, `app/not-found.tsx`

---

## Key concepts in this module

### 1. Refreshing the session before the page renders
The access token lives 15 minutes; the refresh token 7 days (rotated on every use). Without the proxy, the first request after 15 minutes would render as "signed out". `proxy.ts` runs before rendering and asks: is the access token valid for more than 30 s? If not, it calls `POST /api/auth/refresh` itself, then does two things with the new cookies:
- **forwards them to the browser** (Set-Cookie on the response), and
- **rewrites the Cookie header of the current request** (`NextResponse.next({ request: { headers } })`), so the Server Components rendering *this* page already use the new token.

It reads `exp` with `jose.decodeJwt` without verifying the signature. That's fine: the proxy only decides *when* to refresh; the API verifies every token on every call.

### 2. Failure modes, each handled differently
| Situation | Proxy does | Why |
|---|---|---|
| refresh returns 401 (expired/revoked) | clear both cookies, redirect to `/login?next=` | the session is really over |
| API unreachable / 5xx / 429 | let the request through | a hiccup shouldn't sign anyone out; the page shows a "Try again" error or the account-menu fallback |
| garbage tokens | treated as missing → refresh → 401 → login | |

### 3. Prefetches skip the proxy, and why it has to be in the matcher
Links prefetch routes in the background. With Partial Prefetching they fetch only the **static shell** (no user data), so they need no session, and refreshing tokens for them would waste refreshes. The obvious check (`request.headers.has("next-router-prefetch")`) **never fires**: Next strips its router headers from `request` inside the proxy, so RSC and HTML requests are always treated alike. The end-to-end test caught this. The fix is the documented one: `missing: [{ type: "header", key: "next-router-prefetch" }, …]` in the matcher, evaluated before stripping.

### 4. Open-redirect guard
`/login?next=https://evil.example` must not send a freshly signed-in admin to another site. `safeNextPath()` accepts only same-site paths: starts with `/`, not `//` or `/\`, same origin after URL parsing, and never `/login` itself. Both the proxy (already signed in) and the login form (after sign-in) use it. Tested with `//evil.example`, `https://evil.example/x`, `/\evil.example` and `/login`.

### 5. Static shell, streamed user (Cache Components)
Reading the session is request-time work, so with Cache Components it can't be in the static shell. The layout itself reads nothing; only `<CurrentUserMenu>` does, inside `<Suspense fallback={<UserMenuSkeleton />}>`. Result: sidebar, top bar and page skeleton are prerendered HTML that appears instantly, and the account menu streams in a moment later (build output: `◐ Partial Prerender`). `getCurrentUser` is wrapped in React's `cache`, so any page that also needs the user won't call `/auth/me` twice.

If `/auth/me` fails for a reason other than a dead session, the error would escape the layout and replace the whole shell with the root error page. So `CurrentUserMenu` catches it and shows a small fallback menu (Sign out still works). `unstable_rethrow` first re-throws Next's own control-flow errors (the 401 redirect, prerender bail-outs) so they aren't swallowed.

### 6. No flash of the wrong theme or sidebar
Preferences live in localStorage, which the server can't read. Reading a cookie instead would make the shell dynamic. So a tiny inline script in `<head>` runs before the body paints. It sets `data-theme` (the saved choice, else the OS colour scheme) and `data-sidebar="collapsed"` on `<html>`. CSS does the rest through the `dark:` and `sidebar-collapsed:` variants, and React state (Redux) catches up after hydration (`PreferencesSync`). Anything visible is chosen by CSS (the theme icon, the sidebar width and labels), so the server HTML and the first client render always match.

### 7. Accessible shell
- Skip link (first Tab stop) to `<main id="main">`.
- `<nav aria-label="Main">`, `aria-current="page"` on the active link, breadcrumb nav from `md`.
- Collapsed / tablet sidebar: labels remain as screen-reader text, tooltips for mouse users.
- The active item's highlight slides between links (`layoutId`). Bug found by screenshot: `not-sr-only` resets `position` to static, so the absolute highlight covered the label. Fixed with a positioned wrapper, and a browser check now asserts the label is the element actually at its own centre.
- Phone drawer: modal (app root `inert`, focus trap, Escape), closes on navigation (including back/forward).

### 8. Sign-in form UX
Zod validates on submit, then live while you fix a field. API errors become plain sentences: wrong credentials, too many attempts (the backend allows 10 failures per 15 min), offline. After a wrong password the field is focused **and selected**, so typing replaces it. The button keeps its spinner until the redirect lands (no flash of an idle button). `?next=` is read from `window.location` at submit time, which keeps the page fully static (no `useSearchParams`, no Suspense boundary needed).

---

## Verification

### End-to-end auth (Node, cookie jar honouring Max-Age; production build + API with 40 s access tokens): 22/22
Signed-out redirects with `next` · `/` → `/dashboard` · login page renders · wrong password 401 through the `/api` rewrite · login sets both cookies · signed-in render includes the streamed user · **fresh token: no refresh** · `/login` while signed in → onward · four open-redirect attempts blocked · **missing access cookie → page renders and both cookies rotated** · **< 30 s left → refreshed before rendering** · **prefetch → no refresh** · logout clears cookies · protected again after logout · revoked refresh token → login + cookies cleared · garbage tokens → login.

### Real browser (headless Chrome over the DevTools protocol, typing and clicking): 26/26
Deep link → login with `next` · empty submit shows both field errors with `aria-invalid` · errors clear while typing · wrong password alert, password selected · show/hide password · sign-in returns to the requested page · account menu streamed · `aria-current` · client-side navigation · account menu opens, Escape closes and returns focus · first visit follows the OS theme, toggle sticks across reload · active label visible · sidebar collapse sticks across reload with `aria-expanded=false` · tablet rail is 64px · phone: no sidebar, no horizontal scroll · drawer opens with the app inert, a tap navigates and closes it · sign out → login → protected again.

### API outage
Backend stopped: pages render with shell and content, the account menu shows its fallback, cookies are kept.

## Problems found and fixed
| Problem | Fix |
|---|---|
| Prefetches triggered token refreshes | matcher `missing` (Next hides the header from the proxy) |
| Active sidebar label covered by its highlight | positioned wrapper around the label |
| `/auth/me` failure would take down the whole shell | fallback menu, `unstable_rethrow` for Next's control flow |
| Unused eslint-disable in `logout.ts` | removed (rule only fires on string literals) |

## Update: the top bar redesign (2026-11-15)
Feedback: drop the page title, keep the breadcrumb, add a clock with calendar and time zones and a notification bell. Ideas worth knowing:

- **Time without hydration errors.** The server can't know the visitor's "now", so `useNow()` reads time through `useSyncExternalStore` with a server snapshot of `null`: the server and the hydration pass render a placeholder, then React re-renders with the real time. The snapshot is a number that only changes once per minute (or second), so components re-render exactly that often; one shared timer is aligned to the start of each minute and re-checks when a background tab becomes visible.
- **Fixed boxes stop layout shift.** "9:59 AM" → "10:00 AM", the placeholder → real time, 0 → 12 unread: each changes width. The clock button has one fixed width per breakpoint, the badge is an absolutely positioned 18px circle ("9+" keeps two characters inside it), and the account button already had its fixed box. Measured CLS: 0.
- **Preferences in `localStorage`, read safely.** The time-zone list is a string snapshot in `useSyncExternalStore` (stable between changes, unlike a parsed object), parsed and validated on read (unknown zones dropped), and the `storage` event keeps other tabs in sync.
- **Intl does the time-zone work.** `Intl.supportedValuesOf("timeZone")` lists ~420 zones; `timeZoneName: "longOffset"` gives the UTC offset for any instant (so DST is right), `"long"` gives searchable names like "Bangladesh Standard Time"; formatters are cached because the panel re-renders every second.
- **Editable combobox (WAI-ARIA APG).** Focus stays in the input; `aria-activedescendant` points at the highlighted option; the list lives inside the popover (no second floating layer); Escape is stopped at the combobox so it closes the search, not the panel.
- **Polling politely.** The bell fetches after hydration (the shell stays static), every minute only while the tab is visible, on focus, and when a page calls `refreshNotifications()` after a change. "Seen" (stops the ping) is separate from "read" (clears the count).

## Checkpoint summary
- Proxy guards every page and refreshes sessions silently; prefetches and the API are excluded; outages don't sign anyone out.
- Sign-in page, responsive shell (sidebar / rail / drawer), theme and sidebar preferences without flashes, error / 404 / loading screens.
- 22/22 auth checks, 26/26 browser checks, typecheck / lint / build clean.
- **Milestone 3 complete.** Next: **4.1 Doctors UI**.
