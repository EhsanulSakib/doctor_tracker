# Module 4.1 — Doctors UI: Progress

**Status:** done (awaiting review)
**Last updated:** 2026-11-15
**Blockers:** none

## Verification
- `npm run typecheck`, `npm run lint`, `next build` clean. Build output: `/doctors` and `/doctors/[id]` partial prerender (static shell, data streamed).
- Real browser (headless Chrome over the DevTools protocol, production build, API on 8082): **32/32**. Covers the list, search, filters, tokens, sorting, paging, the create / edit / delete flows, the profile page, not-found pages, layout at 1366×768, skeleton geometry and phone width.
  - Laptop 1366×768: no window scrollbar on the list or the profile, and the table fits its width. With 20 rows the table scrolls inside and its header stays sticky.
  - Skeleton vs real (caught during a client navigation): header 45px, row 61px, same top position.
  - Phone 390px: 10 cards, no sideways scroll, filters open as a bottom sheet.
- Regressions: layout 20/20 (CLS ≤ 0.0005 on a fresh `/doctors` load, from table column widths settling), UI 26/26, top bar 20/20. Data reseeded and Atlas synced afterwards.

## Found and fixed during verification
| Problem | Fix |
|---|---|
| Table wider than the screen at 1440px (long emails, 8 columns): "Joined" and the row actions were cut off | Doctor cell capped at 256px (name / email truncate); hospital shown under the specialization below 2xl (own column from 2xl); experience from `lg`, joined from `xl` |
| Phone cards wider than the screen | the card list is `grid-cols-1` (`minmax(0, 1fr)`), so a long email truncates instead of widening its card |
| Search box lost focus while typing | it was keyed by the search text, so each debounced search that landed in the URL remounted it; now it's re-keyed only when something outside clears the search |
| Skeleton rows 2px shorter than real rows | the bars' vertical margins collapsed inside a block wrapper; the two-line skeletons sit in a flex column now |
| Empty name said "Name is too short" | "Name is required" first |

## Notes
- Next 16 with Cache Components keeps recently visited pages mounted but hidden (React Activity) for instant back / forward. Browser checks must only count visible elements (`checkVisibility()`).
