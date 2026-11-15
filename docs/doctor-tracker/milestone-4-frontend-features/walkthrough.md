# Milestone 4 — Frontend Features: Walkthrough

## 4.1 Doctors UI (done 2026-11-15)
The first feature module, and the pattern the other two reuse:
- The server page parses `searchParams` and fetches; a client view gets plain data plus the parsed params.
- Every change is a URL update inside a transition, so old rows stay on screen, dimmed.
- The table fills the remaining height on laptops (`DataTable fill`).
- Dialogs handle create / edit / delete; toast + `router.refresh()` + `refreshNotifications()` after each write.
- Skeletons are the real table in loading mode.

Details: [module-1-doctors-ui/walkthrough.md](module-1-doctors-ui/walkthrough.md).
