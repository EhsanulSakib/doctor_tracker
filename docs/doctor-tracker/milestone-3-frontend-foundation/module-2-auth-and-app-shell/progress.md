# Module 3.2 — Auth + App Shell: Progress

**Status:** done (awaiting review)
**Last updated:** 2026-11-15
**Blockers:** none

## Verification
- `npm run typecheck`, `npm run lint`, `next build` clean. Build output: `/login` static; `/dashboard`, `/doctors`, `/patients` **partial prerender** (static shell, account menu streamed); proxy registered
- End-to-end auth script (Node, cookie jar honouring Max-Age) against `next start` + the API with `ACCESS_TOKEN_TTL_SECONDS=40`: **22/22**
- Real browser (headless Chrome driven over the DevTools protocol, typing and clicking like a person): **26/26**
- API outage: with the backend stopped, pages still render with the shell; the account menu shows its fallback; cookies are kept (no forced sign-out)

## Found and fixed during verification
| Problem | Fix |
|---|---|
| Prefetches spent a token refresh: Next strips `next-router-prefetch` from `request.headers` inside the proxy | matcher `missing: [next-router-prefetch, purpose: prefetch]` (evaluated before stripping), as the Next docs recommend |
| Active sidebar label invisible: `lg:not-sr-only` resets `position` to static, so the absolute highlight painted over it | label wrapped in its own `relative` span |
| A failing `/auth/me` would escape the layout and replace the whole shell with the root error page | `CurrentUserMenu` catches it (after `unstable_rethrow` for Next's redirects / prerender bail-outs) and renders a fallback menu |

## Notes
- Headless Chrome here reports a **dark** OS colour scheme, so first visits start dark (the app follows the OS until the user picks a theme).
