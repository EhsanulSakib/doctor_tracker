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
