# Milestone 4 — Frontend Features: Walkthrough

## 4.1 Doctors UI (done 2026-11-15)
The first feature module, and the pattern the other two reuse:
- The server page parses `searchParams` and fetches; a client view gets plain data plus the parsed params.
- Every change is a URL update inside a transition, so old rows stay on screen, dimmed.
- The table fills the remaining height on laptops (`DataTable fill`).
- Dialogs handle create / edit / delete; toast + `router.refresh()` + `refreshNotifications()` after each write.
- Skeletons are the real table in loading mode.

Details: [module-1-doctors-ui/walkthrough.md](module-1-doctors-ui/walkthrough.md).

## 4.2 Patients UI (done 2026-11-15)
The same pattern again, with the shared parts pulled out (`useNavigateTransition`, `FilterTokens`, `FiltersButton`), plus `DoctorSelect`: an async combobox for the doctor filter and for assigning or moving patients.

Details: [module-2-patients-ui/walkthrough.md](module-2-patients-ui/walkthrough.md).

## 4.3 Dashboard UI (done 2026-11-15)
One stats call, four KPI tiles and five hand-built charts. Each chart's form follows the data's job (area, tall segmented bar, ranked bars), and the colours were checked with a palette validator. The layout fills a laptop screen exactly.

Details: [module-3-dashboard-ui/walkthrough.md](module-3-dashboard-ui/walkthrough.md).

**Milestone 4 complete** (all three modules awaiting review).
