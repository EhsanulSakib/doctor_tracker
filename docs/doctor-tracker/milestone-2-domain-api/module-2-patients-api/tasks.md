# Module 2.2 — Patients API: Tasks

- [ ] [backend] `patients.schema.ts`: create (doctorId required), update (partial, doctorId allowed for reassignment), list query (limit ≤ 50, sort whitelist, date range, enum filters), `:id` param
- [ ] [backend] `patients.service.ts` list: filter builder → parallel find + count → `populate('doctorId', 'name specialization')` (a single `$in` query) → `.lean()`
- [ ] [backend] `patients.service.ts`: getById, create (404 `DOCTOR_NOT_FOUND` if the doctor is missing), update (validate the new doctor on reassignment), delete
- [ ] [backend] `patients.controller.ts` + routes at `/api/patients`
- [ ] [backend] Nested doctor routes: `GET /api/doctors/:id/patients` (same list query, doctor fixed) and `POST /api/doctors/:id/patients`
- [ ] [test] Supertest: create under a doctor; create with an unknown doctor 404; list filters (condition, status, gender, doctorId, date range) + search; update incl. reassignment; delete 204 then 404; invalid id 400
- [ ] [test] Manual curl + `explain()` on a filter query confirms IXSCAN
