# Module 5.1 — Deploy + README: Tasks

Scope changed on 2026-11-15: the user deploys the app themselves ("do not deploy… just make the readme file properly as requirements"). Deployment config files were not added; the README's *Deployment notes* list the exact settings instead.

- [ ] ~~[config] `render.yaml`~~: not needed (the user deploys; build / start / health check / env vars are in the README)
- [ ] ~~[config] Vercel notes / production URL check~~: the README covers root directory, `BACKEND_URL` (read at build time by the rewrite) and the API env vars; the URL check happens at the user's deploy
- [x] [config] Production behaviour confirmed in code for the README: `Secure` cookies with `NODE_ENV=production`, `trust proxy` from `TRUST_PROXY`, CORS origin from `FRONTEND_URL`, no stack traces in production errors, `seed` refuses production without `--force`, `seed:admin` for the production admin
- [x] [docs] `README.md` following the spec's template, in order:
  - **Description** (elevator pitch);
  - **Setup Guide** (prerequisites, Docker or Atlas, both `.env.example` files with every variable, seed, run, scripts, troubleshooting, demo credentials);
  - **System Architecture** (Mermaid service / data-flow diagram, authentication sequence, data model, project structure);
  - **Technical Decisions** (two deep dives: cookie sessions with rotating refresh tokens behind a same-origin proxy; Server Components + URL as state with Redux only for UI state; plus other decisions in brief);
  - **Visual Evidence** (12 desktop + 6 mobile screenshots, light and dark).

  Further sections: features, performance and query optimization (indexes + `explain()` results), security, API reference, testing, scalability, deployment notes, documentation map.
- [x] [test] Screenshots taken from the production build in headless Chrome (DevTools protocol, 2× pixel density, WebP, ~2 MB total) → `docs/screenshots/`: login, dashboard, doctors, filtered doctors, doctor profile, patients, doctor form (validation), patient filters with the doctor picker, notifications, calendar / time zones, dark dashboard, dark doctors; phone: login, dashboard, navigation drawer, doctors, doctor profile, filters bottom sheet
- [x] [test] End-to-end passes already run on fresh seeds in modules 4.1–4.3 (create doctor → add patients → filter / search / paginate → edit / reassign → delete guard → delete → sign out); figures quoted in the README's Testing section
- [x] [docs] Consistency review: README facts checked against the code (indexes, cookie flags, rate limits, role checks, token hashing, security headers, scripts, env schema) and the `db:explain` output
