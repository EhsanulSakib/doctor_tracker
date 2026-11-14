# Module 2.1 — Doctors API: Tasks

- [x] [backend] `constants/enums.ts`: SPECIALIZATIONS, DOCTOR_STATUSES, CONDITIONS, PATIENT_STATUSES, GENDERS (+ derived types)
- [x] [backend] `lib/search-key.ts` (`buildSearchKey`, `searchKeyFilter`, `escapeRegex`) + `lib/pagination.ts` (`toSkip`, `paginate`, `MAX_PAGE_SIZE`)
- [x] [backend] `lib/schemas.ts`: shared Zod pieces (objectId, id params, pagination, search, dates, email, phone, name, `optionalQuery`, `rangeIsOrdered`)
- [x] [backend] `doctor.model.ts`: fields + validation, `searchKey` maintained in `pre('validate')`, 8 indexes
- [x] [backend] `patient.model.ts`: schema + 5 indexes (endpoints come in 2.2)
- [x] [backend] `doctors.schema.ts`: create (status defaults to active), update (partial, no defaults, at least one field), list query (coerced, limit ≤ 50, sort whitelist, ordered ranges), options query
- [x] [backend] `doctors.service.ts`: list (filter builder, parallel find + count, lean + projection, one `$group` for the page's patient counts), get, create, update (load + save so hooks run), delete with guard (409 `DOCTOR_HAS_PATIENTS`), hospitals (distinct), options (max 20)
- [x] [backend] `doctors.controller.ts` + `doctors.routes.ts` behind `requireAuth` + `requireRole('admin')`, mounted at `/api/doctors`
- [x] [test] Supertest (22 tests): auth, create / defaults / validation / duplicate email, pagination + stable order, default sort, search (name word, surname, email, phone, multi-word, regex chars), every filter, invalid queries, operator keys ignored, patient counts, get / 404 / 400, update + search sync, empty update / duplicate email / 404, delete guard → 204 → 404, hospitals, options
- [x] [test] Manual curl against Atlas (15 checks) + `npm run db:explain` (every query uses an index)
- [x] [backend] Added `src/scripts/explain-queries.ts` + `npm run db:explain`
- [x] [backend] Fixes found during verification: one validation message per field (error handler dedupes; phone rules merged); friendly "X is required" / range messages
- [x] [test] Test infra: indexes built before the first test; in-memory mongod gets a small cache + 60 s start timeout; bcrypt cost 4 in tests
