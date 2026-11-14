# Module 3.2 — Auth + App Shell: Context

## proxy.ts flow
```
request (page route)
  ├─ path is /login
  │    └─ has dt_refresh and the refresh succeeds or dt_access is valid → redirect /dashboard
  └─ protected path
       ├─ no dt_refresh → redirect /login?next=<path>
       ├─ dt_access present and exp > now + 30s → continue
       └─ otherwise → POST {BACKEND_URL}/api/auth/refresh with the cookie
            ├─ 200 → copy Set-Cookie to the response; rewrite the request Cookie header
            │        so Server Components in THIS request see the new access token
            └─ 401 → delete both cookies, redirect /login?next=<path>
```
- `exp` is read with `jose.decodeJwt` (no secret on the frontend). The proxy only decides *when* to refresh; the backend still verifies every request.
- `next` is accepted only if it starts with `/` and not `//` (open-redirect guard).

## Shell layout
- Desktop ≥ 1024px: 240px sidebar (64px collapsed) + content max-width 1280px.
- Tablet 768–1023px: collapsed sidebar by default.
- Mobile < 768px: top bar + slide-in drawer; tables switch to stacked cards.

## Login page
Left: brand panel (wordmark, one-line value statement, subtle ledger-line pattern in CSS). Right: form card. On mobile only the form shows, with the wordmark above. Demo credentials are not printed on the page; they live in the README.
