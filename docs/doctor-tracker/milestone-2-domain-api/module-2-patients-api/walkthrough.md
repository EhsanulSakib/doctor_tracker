# Module 2.2 — Patients API: Walkthrough

> A guide to every file this module created or changed, the ideas behind it, and how it was verified.
> Status: **done** (2026-11-15) · 26 new automated tests (70 total) · 21 manual checks · every patient query uses an index.

## What this module built
- **Patient CRUD** at `/api/patients`: create, read, update (including **reassigning** to another doctor), hard delete.
- **List endpoint** with indexed prefix search, 6 filters (condition, status, gender, doctor, admitted from/to), 5 sort orders, page-number pagination, and each row's doctor (`{ id, name, specialization }`).
- **Nested doctor routes**: `GET /api/doctors/:id/patients` (the doctor profile's patient table) and `POST /api/doctors/:id/patients` ("add patient" from the doctor page).
- **Clearable optional fields**: `email` / `notes` can be removed with `""` or `null`.
- One more index (`{ name: 1, _id: 1 }`) and 7 more queries in `npm run db:explain`.

## Files

### Created
```
backend/src/modules/patients/
├── patients.schema.ts       Zod: create / create-under-doctor / update / list queries
├── patients.service.ts      queries and business rules
├── patients.controller.ts   HTTP layer (incl. the two nested handlers)
└── patients.routes.ts       /api/patients routes (admin only)
backend/tests/patients.test.ts   26 tests
```

### Changed
| File | Change | Why |
|---|---|---|
| `src/routes.ts` | mounts `patientsRouter` at `/api/patients` | |
| `src/modules/doctors/doctors.routes.ts` | `GET` + `POST /:id/patients` → patients controller | nested URLs live with their parent |
| `src/modules/patients/patient.model.ts` | index `{ name: 1, _id: 1 }` | name sorts served by an index |
| `src/lib/schemas.ts` | `clearableField()` | optional fields that can be emptied |
| `src/scripts/explain-queries.ts` | 7 patient queries; real doctor id for per-doctor plans | verify index use |
| `tests/helpers.ts` | `patientPayload()` | valid patient body fixture |

## How a list request flows
```
GET /api/patients?doctorId=…&condition=Asthma&page=1&limit=10
  │
  ├─ patients.routes.ts        requireAuth → requireRole('admin')
  ├─ patients.controller.ts    handler({ query: listPatientsQuerySchema })
  │                              "1" → 1, empty values dropped, sort whitelisted, date range checked
  └─ patients.service.ts       listPatients(query)
        buildFilter()  →  { doctorId: '…', condition: 'Asthma' }
        │
        ├─ query 1 ┐ Promise.all   find(filter).select(fields).sort({ admissionDate: -1, _id: -1 }).skip(0).limit(10).lean()
        ├─ query 2 ┘ (parallel)    countDocuments(filter)
        └─ query 3                 DoctorModel.find({ _id: { $in: <doctor ids on this page> } })   ← names, one query
        │
        └─ { data: [...patients with doctor], meta: { page, limit, total, totalPages } }
```
For `GET /api/doctors/:id/patients`, the doctor lookup doesn't depend on the page, so **all three queries run in parallel**:
```
Promise.all([ findDoctorSummary(id), find(...), countDocuments(...) ])  →  404 if the doctor is missing
```

## Suggested reading order
1. `modules/patients/patient.model.ts`: fields and indexes (from 2.1, plus the name index)
2. `lib/schemas.ts` → `clearableField()`
3. `modules/patients/patients.schema.ts`: validation, the two create schemas, the shared list fields
4. `modules/patients/patients.service.ts`: **the core**: `findDoctorSummaries`, `findPage`, `listDoctorPatients`, `updatePatient`
5. `patients.controller.ts`, `patients.routes.ts`, the two lines added to `doctors.routes.ts`
6. `tests/patients.test.ts`

---

## Key concepts in this module

### 1. Doctor names without N+1 (`findDoctorSummaries`)
Each row needs its doctor's name. The naive version runs one `findById` per row (10 extra queries per page). Instead, collect the page's distinct `doctorId`s and run **one** query: `DoctorModel.find({ _id: { $in: ids } }).select('name specialization')`, then join in JS through a `Map`. This is exactly what Mongoose's `populate()` does internally. Doing it by hand keeps the result fully typed, and keeps `doctorId` on the row even if a doctor were missing (populate replaces it with `null`).

Why not `$lookup` in an aggregation? Then the count would need its own aggregation too. With `find` + `countDocuments`, the count stays a cheap index count.

### 2. Reuse what you already loaded
- **Create** must check that the doctor exists anyway, so it loads `{ name, specialization }` and builds the response's `doctor` field from it: no extra read after the insert.
- **Update** with a new `doctorId` loads the patient and the new doctor **in parallel** (`Promise.all`). Only if `doctorId` didn't change does it read the current doctor after saving.
- **A doctor's list** loads the doctor once for the 404 check and reuses it for every row.

### 3. Two kinds of "doctor not found"
| Where the id comes from | Response | Why |
|---|---|---|
| request **body** (`POST /api/patients`, `PATCH` reassignment) | `404 DOCTOR_NOT_FOUND`, `details.fields: ['doctorId']` | it's a form field; the UI shows the error on the doctor select |
| the **URL** (`/api/doctors/:id/patients`) | `404 NOT_FOUND` "Doctor not found" | the page itself doesn't exist |

### 4. Clearing optional fields (`clearableField`)
A form with an emptied email input sends `"email": ""`. Without special handling that's an invalid email (400), and there'd be no way to remove a stored email. `clearableField(schema)` pre-processes `""`, whitespace and `null` to `undefined`:
- **create:** the field is simply not stored.
- **update:** Zod keeps the key (`{ email: undefined }`), so the "at least one field" check passes; `doc.set()` + `save()` turn it into `$unset`; the `searchKey` hook sees `email` modified and rebuilds the tokens without it.

The API always returns these fields, as `null` when empty, so the frontend type is `string | null`, never "maybe missing".

### 5. Same filters, two endpoints (`patients.schema.ts`)
`listFields` holds the shared filters. `listPatientsQuerySchema` adds `doctorId`; `listDoctorPatientsQuerySchema` doesn't, so on the nested route `?doctorId=` is dropped as an unknown key and the path's doctor always wins. In the same way, `createDoctorPatientSchema = createPatientSchema.omit({ doctorId: true })` strips a body `doctorId` on the nested create.

### 6. Index choices
Every filter + default-sort combination maps onto an ESR index (`doctorId|condition|status` → `admissionDate` → `_id`), so MongoDB reads exactly 10 index keys for a page of 10. Search uses the multikey `searchKey` index and then sorts the (small) match set in memory, because one index can't serve a prefix match on tokens and a date order at once. `gender` has no index on purpose: with 3 values it would rarely beat the others.

---

## File by file (short)
| File | Main exports | Notes |
|---|---|---|
| `patients/patients.schema.ts` | `createPatientSchema`, `createDoctorPatientSchema`, `updatePatientSchema`, `listPatientsQuerySchema`, `listDoctorPatientsQuerySchema`, `PATIENT_SORTS` + input types | no defaults in the update schema (the `.partial()` trap from 2.1) |
| `patients/patients.service.ts` | `listPatients`, `listDoctorPatients`, `getPatient`, `createPatient`, `createDoctorPatient`, `updatePatient`, `deletePatient`, `PatientDto`, `DoctorSummary` | `SORTS` map ends every sort with `_id` |
| `patients/patients.controller.ts` | `list`, `getById`, `create`, `update`, `remove`, `listForDoctor`, `createForDoctor` | one `handler()` each |
| `patients/patients.routes.ts` | `patientsRouter` | `requireAuth` + `requireRole('admin')` on all |
| `lib/schemas.ts` | `clearableField` (new) | |

---

## Tests (`tests/patients.test.ts`, 26)
| Group | Proves |
|---|---|
| auth | 401 on `/api/patients` (GET, POST) and `/api/doctors/:id/patients` without a session |
| create | response has `doctor { id, name, specialization }`, lowercased email, no `searchKey` / `_id` / `__v` · status defaults to active · omitted or blank `email`/`notes` → `null` · every invalid field reported (10 paths, "Choose a doctor") · unknown doctor → 404 `DOCTOR_NOT_FOUND`, malformed `doctorId` → 400, nothing written |
| nested create | patient goes to the path's doctor even if the body names another; doctor `patientCount` updates · unknown doctor 404 · bad id 400 |
| list | pagination meta + stable slices · admission date desc by default, asc, `-name`, `-createdAt` · each row's doctor (2 doctors) · search by name word / email / phone with dashes / multi-word, regex characters as text · every filter incl. combined and inclusive end date, empty params ignored · 9 invalid queries → 400 · operator-style keys ignored |
| nested list | only that doctor's patients, filters apply, `?doctorId=` ignored · empty page for a doctor without patients · 404 unknown · 400 bad id / bad filter |
| get | patient with doctor · 404 · 400 |
| update | only given fields change (status kept), search in sync · reassignment moves the patient (counts 1 → 0 / 0 → 1) · reassignment to an unknown doctor → 404 and nothing saved · `""` / `null` clears email and notes (raw document has no field; `searchKey` drops the email) · empty body / bad values / required fields set to `null` → 400 · 404 |
| delete | 204 → GET 404 → DELETE 404, and the doctor can now be deleted · 400 bad id |

## Verification
- `tsc --noEmit` and the production build are clean; `vitest run` 70/70.
- 21 manual curl checks (QA guide § 2.2) on a local throwaway MongoDB 8.2 (no Atlas credentials in this clone).
- `npm run db:explain` on 402 patients / 14 doctors:
```
✓ index  patients: by doctor (delete guard / counts)  IXSCAN(doctorId_1_admissionDate_-1__id_-1)  keys 1 · docs 1
✓ index  patients: default list (newest admission)     IXSCAN(admissionDate_-1__id_-1)            keys 10 · docs 10
✓ index  patients: search "maya"                        SORT ← IXSCAN(searchKey_1)                 keys 42 · docs 41 → 10 returned
✓ index  patients: one doctor's list                    IXSCAN(doctorId_1_admissionDate_-1__id_-1)  keys 2 · docs 2
✓ index  patients: condition filter                     IXSCAN(condition_1_admissionDate_-1__id_-1) keys 10 · docs 10
✓ index  patients: status filter                        IXSCAN(status_1_admissionDate_-1__id_-1)    keys 10 · docs 10
✓ index  patients: admission date range                 IXSCAN(admissionDate_-1__id_-1)            keys 10 · docs 10
✓ index  patients: sort by name                         IXSCAN(name_1__id_1)                        keys 10 · docs 10
```
With realistic data, the doctors' search also switched to `IXSCAN(searchKey_1)` (on 2 doctors in 2.1 the planner preferred the date index), confirming the note left in 2.1.

## Problems found during this module
| Problem | Fix |
|---|---|
| `npx vitest run` from a lowercase `d:\` path failed every suite ("failed to find the runner") | Windows path-casing issue in Vitest, not the code: run from `D:\project\doctor_tracker\backend`. Noted in the QA guide |
| No way to remove a stored email/notes; an emptied input would be a 400 | `clearableField()` + `$unset` on update |

## Checkpoint summary
- Patients API complete: CRUD with reassignment, indexed search, 6 filters, 5 sorts, pagination, doctor names in one `$in` query, nested doctor routes, clearable optional fields.
- 70/70 tests; type check and build clean; 21 manual checks; every patient query uses an index.
- Next: **2.3 Dashboard API + seed** (re-run `npm run db:explain` on the seeded Atlas data there).
