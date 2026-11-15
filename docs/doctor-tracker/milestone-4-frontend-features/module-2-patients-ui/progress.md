# Module 4.2 — Patients UI: Progress

**Status:** done (awaiting review)
**Last updated:** 2026-11-15
**Blockers:** none

## Verification
- `npm run typecheck`, `npm run lint`, `next build` clean (`/patients`: partial prerender, data streamed).
- Real browser (headless Chrome over the DevTools protocol, production build, API on 8082): **17/17**.
  - Reassigning a patient moves them between the two doctors' `patientCount` (checked through the API), and the bell refreshes at once.
  - Skeleton vs real (client navigation): header 44px, row 61px, same position.
  - 1366×768: no window scrollbar, and the table fits its width. Phone: 10 cards, no sideways scroll.
- Regressions: doctors 32/32 (the profile's patient form in fixed-doctor mode), layout 20/20 (CLS ≤ 0.0006 on a fresh `/patients` load at 1440px+, from column widths settling), UI 26/26, top bar 20/20. Data reseeded and Atlas synced afterwards.

## Found and fixed during verification
| Problem | Fix |
|---|---|
| Reopening the doctor picker and typing showed the previous full list (highlight still on the old doctor) until the debounced search returned, so a quick Enter picked the wrong doctor | until results for the typed text arrive, the previous results are narrowed to matching names and the highlight resets to the first one |
| The current doctor sat out of view when the picker opened on a long list | the highlighted option is scrolled into view |
