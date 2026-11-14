# Module 2.1 — Doctors API: Tasks

- [ ] [backend] `constants/enums.ts`: SPECIALIZATIONS, DOCTOR_STATUSES, CONDITIONS, PATIENT_STATUSES, GENDERS
- [ ] [backend] `lib/search-key.ts` (tokenize name/email/phone → lowercased token array) + `escapeRegex`; `lib/pagination.ts` (page/limit → skip, build `meta`)
- [ ] [backend] `doctor.model.ts`: fields + validation, `searchKey` maintained in `pre('save')` / `pre('findOneAndUpdate')`, indexes (see context)
- [ ] [backend] `patient.model.ts`: schema + indexes (endpoints come in 2.2)
- [ ] [backend] `doctors.schema.ts`: create, update (partial, at least one field), list query (coerced numbers/dates, limit ≤ 50, sort whitelist), `:id` ObjectId param
- [ ] [backend] `doctors.service.ts` list: filter builder → parallel find + count → patient counts for the page via one `$group` on the page's doctor ids → merge
- [ ] [backend] `doctors.service.ts`: getById (+ patientCount), create, update, delete with guard (409 `DOCTOR_HAS_PATIENTS`), `hospitals()` (distinct, sorted), `options(search)` (id + name + specialization, limit 20, for selects)
- [ ] [backend] `doctors.controller.ts` + `doctors.routes.ts`, mounted at `/api/doctors`
- [ ] [test] Supertest: create ok / validation / duplicate email 409; list search (first-name and surname prefix), each filter, pagination meta; update; delete guard 409 then 204 after the patients are removed; 401 without cookie
- [ ] [test] Manual curl + `explain('executionStats')` on search and filter queries confirms IXSCAN
