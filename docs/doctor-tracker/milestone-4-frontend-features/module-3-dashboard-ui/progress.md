# Module 4.3 — Dashboard UI: Progress

**Status:** done (awaiting review)
**Last updated:** 2026-11-15
**Blockers:** none

## Verification
- `npm run typecheck`, `npm run lint`, `next build` clean (`/dashboard`: partial prerender, data streamed).
- Real browser (headless Chrome over the DevTools protocol, production build, API on a second local instance): **18/18**.
  - KPIs, the 30 time buckets, top doctors (names, counts, profile links), condition / specialization / status breakdowns all equal the API response; bar lengths are proportional.
  - The time chart reads correctly by keyboard (focus = latest bucket, ← = the one before) and by hover (snaps to the nearest bucket).
  - The range switch works by click and arrow keys (URL, selected tab, KPI, chart unit follow; 12 months shows "No earlier data to compare"); an unknown `?range=` falls back to 30 days.
  - Dark mode marks use the dark accent step (#6366f1).
  - 1366×768, 1280×720, 1920×1080: no window or page scrollbar; at 1366 and 1920 every list shows all its rows.
  - Skeleton vs real (client navigation): all 9 boxes (4 tiles + 5 chart cards) in the same place and size.
  - Phone: no sideways scroll.
- Palette checked with the dataviz validator: status fills #0284c7 / #d97706 / #059669 pass in both themes (CVD 7.9 in the warning band → secondary encoding: labels on the blocks, a legend and 2px gaps); single-series accent #4f46e5 (light) / #6366f1 (dark; #818cf8 failed the dark lightness band).
- Regressions: doctors 32/32, patients 17/17, layout 18/18 (CLS 0 on `/dashboard` at four sizes), UI 26/26, top bar 20/20. Data reseeded and Atlas synced afterwards.

## Found and fixed during verification
| Problem | Fix |
|---|---|
| At 1366×768 the time chart overflowed its card and the ranked lists scrolled | one-line chart headers (title left, takeaway right), tighter KPI tiles, 18px minimum rows, chart without a minimum height |
| The page (`<main>`) still scrolled by ~190px | the visually hidden data table: a `<table>` ignores the 1px height of `sr-only`, so its full length counted; `sr-only` moved to a wrapper `div` |
| KPI tiles 2px taller than their skeleton | the inline arrow + figure in the delta line grew its line box; the line is a fixed 16px |
| Phone: x-axis labels collided, KPI labels were cut | first / middle / last labels only on phones; shorter labels there |
| Tooltip dates read "Wed, 11 Nov, 2026" | "Wed, 11 Nov 2026"; the headline uses a short form ("13 Nov") |
