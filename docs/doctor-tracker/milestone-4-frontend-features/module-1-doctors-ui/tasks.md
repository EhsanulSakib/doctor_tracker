# Module 4.1 — Doctors UI: Tasks

- [ ] [frontend] `features/doctors`: types, API helpers (server list/detail/hospitals, client create/update/delete), Zod form schema mirroring the backend rules
- [ ] [frontend] `hooks/use-query-params.ts` (read/patch URL params, reset page on filter change) + `use-debounce.ts`
- [ ] [frontend] `/doctors` page: header with total count + "New doctor"; toolbar (search, specialization, hospital, status, joined range, experience range, sort); filter chips; DataTable (name + email, specialization, hospital, status badge, experience, patients, joined, row actions); Pagination with page-size select
- [ ] [frontend] `DoctorFormDialog` (create / edit): React Hook Form + Zod, server 409 email error mapped onto the field
- [ ] [frontend] Delete doctor: ConfirmDialog; 409 `DOCTOR_HAS_PATIENTS` shown as a friendly explanation with the patient count
- [ ] [frontend] `/doctors/[id]` page: profile header (avatar initials, specialization, hospital, contact, status, experience), mini stats, patients table with its own filters and pagination
- [ ] [frontend] `PatientFormDialog` (shared with 4.2): add patient with the doctor preset; delete patient from the doctor page
- [ ] [frontend] `loading.tsx` skeletons + empty states (no doctors yet / no results for filters)
- [ ] [test] Manual browser pass (desktop + mobile width): search, every filter, pagination, create, edit, delete guard, detail page add/delete patient; `typecheck` / `lint` / `build`
