# Module 4.3 — Dashboard UI: Tasks

- [ ] [frontend] `features/dashboard`: types + `serverFetch` stats call
- [ ] [frontend] `/dashboard` page (server): range tabs (30d / 90d / 12m) synced to `?range=`, "updated at" timestamp
- [ ] [frontend] KPI strip: total doctors, total patients, new patients (delta vs previous period with up/down tone), avg patients per doctor; count-up animation with motion
- [ ] [frontend] Charts (client, `next/dynamic`, colors from tokens, custom tooltip): patients over time (area), top-10 doctors (horizontal bar, links to doctor pages), patients by condition (bar), status split (stacked bar / donut), doctors by specialization (bar)
- [ ] [frontend] Responsive grid (1 col mobile → 2 → 12-col desktop); loading skeleton; empty state when there's no data
- [ ] [test] Manual: each range, values match the API response, dark mode chart colors, mobile layout; `typecheck` / `lint` / `build`
