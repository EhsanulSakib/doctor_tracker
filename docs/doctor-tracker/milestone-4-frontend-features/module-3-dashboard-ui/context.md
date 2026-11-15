# Module 4.3 — Dashboard UI: Context

## Layout (desktop)
```
┌ Overview ─────────────────────────────── [30d | 90d | 12m] ┐
│ 15 doctors │ 200 patients │ 21 new  ▲23.5% │ 13.3 per doctor │
├────────────────────────────────────────┬───────────────────┤
│ Patients over time (area)              │ Status split      │
├────────────────────────────────────────┴───────────────────┤
│ Top doctors by patients (horizontal bar)  │ By condition   │
├───────────────────────────────────────────┴────────────────┤
│ Doctors by specialization (bar)                            │
└────────────────────────────────────────────────────────────┘
```

## Chart styling rules
- One accent hue (teal) for single-series charts; a restrained 5-step categorical palette from the tokens for breakdowns.
- Hairline gridlines only on the value axis; no chart borders; axis labels in `--ink-muted`, 11px.
- Tooltips are custom components (surface + hairline + tabular numbers), not the Recharts defaults.
- Every chart has a short heading plus a one-line takeaway (e.g. "Busiest month: March"), computed from the data.

## Data
Single `serverFetch('/api/dashboard/stats', { searchParams: { range } })`; the backend caches for 60 s, so switching ranges is cheap.

## Implementation notes / changes from plan (2026-11-15)
- **No chart library.** Recharts was dropped. There are five simple charts, and hand-built SVG + HTML gives exact token styling, tooltips that are real components, server rendering, and no extra bundle.
  - The area chart is one SVG that stretches to its box (`preserveAspectRatio="none"` with non-scaling 2px strokes), so it renders on the server at any size.
  - Gridlines, labels, the crosshair, the dot and the tooltip are HTML on top, so they never stretch.
  - The bars are HTML widths.
- **Forms chosen by the data's job** (dataviz method):
  - Patient status, one whole in 3 parts, is a **tall segmented bar** with a legend instead of a donut.
  - The rankings (doctors, conditions, specializations) are **ranked horizontal bars in one hue**, value at the tip.
  - New patients over time is a **single-series area chart**.
- **Colours** are validated tokens: `--chart-accent` (#4f46e5 light / #6366f1 dark), `--chart-active` / `--chart-treatment` / `--chart-recovered` (the badge hues, same in both themes), `--chart-ink` (text on the amber block). Text never wears a series colour.
- **Takeaways are factual one-liners** computed from the data ("Busiest week: week of 31 Aug (9)", "Most common: Migraine (36)"), on the same line as the title so the charts keep their height.
- **Range vs snapshot:** only "New patients" and the time chart follow the range. Their labels name the period, and the other cards describe all current data.
- **Interaction:** crosshair + tooltip on the time chart, by pointer or arrow keys. A visually hidden table lists every bucket. Ranked rows show the share on hover / focus. Switching range keeps the current numbers on screen, dimmed, until the new ones arrive (no skeleton flash), and the changed KPI counts to its new value.
- **Fits the screen:** toolbar, KPI row, then a 12-column grid that takes the remaining height (rows 4fr / 6fr). Cards share it, and lists divide their card's height between rows (18px minimum). Below `lg` the cards have fixed heights and the page scrolls normally.
