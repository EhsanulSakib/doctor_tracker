# Module 2.2 — Patients API: Tasks

- [x] [backend] `patients.schema.ts`: create (doctorId required), update (partial, doctorId allowed for reassignment), list query (limit ≤ 50, sort whitelist, date range, enum filters), `:id` param
- [x] [backend] `patients.service.ts` list: filter builder → parallel find + count → doctor names in a single `$in` query → `.lean()` (done by hand instead of `populate`, see context.md)
- [x] [backend] `patients.service.ts`: getById, create (404 `DOCTOR_NOT_FOUND` if the doctor is missing), update (validate the new doctor on reassignment), delete
- [x] [backend] `patients.controller.ts` + routes at `/api/patients`
- [x] [backend] Nested doctor routes: `GET /api/doctors/:id/patients` (same list query, doctor fixed) and `POST /api/doctors/:id/patients`
- [x] [test] Supertest (26 tests): create under a doctor; create with an unknown doctor 404; list filters (condition, status, gender, doctorId, date range) + search; update incl. reassignment; delete 204 then 404; invalid id 400
- [x] [test] Manual curl (21 checks) + `npm run db:explain` on 400 patients: every patient query uses an index (IXSCAN)
- [x] [backend] `lib/schemas.ts`: `clearableField()`, so optional body fields (`email`, `notes`) can be cleared with `""` or `null`
- [x] [backend] `patient.model.ts`: added `{ name: 1, _id: 1 }` for the name sorts
- [x] [backend] `explain-queries.ts`: 7 patient queries added; per-doctor plans use a real doctor id
