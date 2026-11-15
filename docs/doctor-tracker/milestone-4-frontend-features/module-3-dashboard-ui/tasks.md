# Module 4.3 — Dashboard UI: Tasks

- [x] [frontend] `features/dashboard`: types, `getDashboardStats(range)` (one `serverFetch`), `format.ts` (bucket labels per unit in UTC, clean ticks, shares)
- [x] [frontend] `/dashboard` page (server): range switch (30 days / 90 days / 12 months, a radio group) synced to `?range=` (anything else → 30 days), "Updated <time>" from `generatedAt`
- [x] [frontend] KPI tiles: doctors (active), patients (under care), new patients for the range with the delta vs the previous period (▲ / ▼, "No earlier data to compare" when the API sends `null`), patients per doctor; the numbers count between values on a range switch (motion, reduced-motion aware)
- [x] [frontend] Charts, hand-built (SVG + HTML, no chart library; colours from validated tokens; custom tooltips): new patients per day / week / month (area, crosshair + keyboard), patient status (tall segmented bar + legend), patients per doctor (top 10, ranked bars linking to profiles), patients by condition, doctors by specialization (ranked bars)
- [x] [frontend] Layout: fills a laptop screen exactly (no window or page scrollbar at 1280×720 and up), 2 columns on tablets, 1 on phones; loading skeleton with the same boxes; empty state when there is no data
- [x] [test] Real-browser run: every KPI, chart value and link against the API, range switch (click + keyboard), chart keyboard + hover, dark-mode mark colour, fit at three laptop sizes, skeleton geometry, phone: **18/18**; regressions doctors 32/32, patients 17/17, layout 18/18, UI 26/26, top bar 20/20; `typecheck` / `lint` / `build` clean
