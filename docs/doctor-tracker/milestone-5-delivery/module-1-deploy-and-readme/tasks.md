# Module 5.1 — Deploy + README: Tasks

- [ ] [config] `render.yaml` (build `npm ci && npm run build`, start `npm start`, health check `/api/health`, env var list)
- [ ] [config] Vercel notes: root directory `frontend/`, env `BACKEND_URL`; confirm the rewrite works with the production URL
- [ ] [config] Production checks: `Secure` cookies, `trust proxy`, CORS origin, rate-limit IPs behind the proxy, no stack traces in error responses
- [ ] [docs] `README.md`: elevator pitch; features; tech stack; setup guide (docker-compose / Atlas, both `.env.example` files, seed, run); demo credentials; system architecture (Mermaid diagram + data flow); Technical Decision 1 (refresh-token rotation behind a same-origin proxy); Technical Decision 2 (server-side fetching + Redux UI-state split); indexing strategy; security notes; scalability notes; API overview; testing
- [ ] [test] Screenshots with Playwright headless: login, dashboard, doctors, doctor detail, patients, a dialog (desktop 1440px + mobile 390px, light + one dark) → `docs/screenshots/`
- [ ] [test] Full end-to-end pass on a fresh seed: login → dashboard → create doctor → add patients → filter/search/paginate → edit/reassign → delete guard → delete → logout
- [ ] [docs] Final consistency review of `feature.md`, FE guide, QA guide
