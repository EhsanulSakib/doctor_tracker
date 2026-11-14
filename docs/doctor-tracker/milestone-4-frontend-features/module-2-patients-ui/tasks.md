# Module 4.2 — Patients UI: Tasks

- [ ] [frontend] `features/patients`: types, API helpers (server list, client update/delete), form schema (reuses the 4.1 dialog)
- [ ] [frontend] `DoctorSelect`: async searchable select using `/api/doctors/options` (debounced), for the filter and for reassignment
- [ ] [frontend] `/patients` page: header with total count; toolbar (search, condition, status, gender, doctor, admission range, sort); filter chips; DataTable (name + contact, age / gender, condition, status badge, doctor link, admission date, actions); Pagination
- [ ] [frontend] Edit patient via `PatientFormDialog` (including doctor reassignment)
- [ ] [frontend] Delete patient: ConfirmDialog → toast → refresh
- [ ] [frontend] Loading skeleton + empty states
- [ ] [test] Manual browser pass (desktop + mobile): search, every filter, pagination, edit + reassign (doctor counts update), delete; `typecheck` / `lint` / `build`
