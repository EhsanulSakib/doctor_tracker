# Module 4.2 — Patients UI: Tasks

- [x] [frontend] `features/patients`: `doctorId` URL param (validated id), `server.ts` (`getPatients`, `getDoctorOption` for the filter's name), `createPatient` (`POST /api/patients`); form schema gains the doctor (reuses the 4.1 dialog)
- [x] [frontend] `DoctorSelect` (`features/doctors/components/doctor-select.tsx`): editable combobox over `/api/doctors/options` (debounced 250 ms, latest request wins), used in the Filters dialog and in the patient form
- [x] [frontend] `/patients` page: toolbar (search, status + condition selects from `xl`, Filters dialog with status / condition / gender / doctor / admission range / sort, "New patient"); removable filter tokens; DataTable (patient + age · gender · phone, condition, status badge, doctor link + specialization, admitted from `xl`, actions); Pagination
- [x] [frontend] Create and edit via `PatientFormDialog` with the doctor picker; changing the doctor reassigns ("Patient moved" toast); the doctor profile keeps the fixed-doctor mode (`fixedDoctor`)
- [x] [frontend] Delete patient: ConfirmDialog → toast → refresh (shared `DeletePatientDialog`)
- [x] [frontend] Loading skeleton (the real table in loading mode) + empty states (no patients yet / no results); unknown `doctorId` filter dropped by a redirect
- [x] [frontend] Shared with 4.1: `FilterTokens` + `FiltersButton` (`components/ui/filter-tokens.tsx`) and `useNavigateTransition` (`hooks/use-navigate-transition.ts`); the doctors views now use them too
- [x] [test] Real-browser run (desktop + phone): search, inline filters + tokens, filters dialog with the doctor picker, stale doctor filter, sort, paging, create (validation incl. doctor), picker Escape inside the dialog, reassign (doctor counts update, bell refreshes), delete, layout, skeleton geometry: **17/17**; regressions doctors 32/32, layout 20/20, UI 26/26, top bar 20/20; `typecheck` / `lint` / `build` clean
