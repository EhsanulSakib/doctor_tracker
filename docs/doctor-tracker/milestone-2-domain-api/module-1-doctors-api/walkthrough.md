# Module 2.1 — Doctors API: Walkthrough

> A guide to every file this module created or changed, the query-optimization ideas behind it, and how it was verified.
> Status: **done** (2026-11-14) · 22 new automated tests (44 total) · 16 manual checks on Atlas · every query uses an index.

## What this module built
- **Doctor model** with validation and 8 purpose-built indexes.
- **Patient model** with 5 indexes. Its endpoints come in 2.2, but doctors already need it for patient counts and the delete guard.
- **Doctor CRUD:** create, read, update, delete (blocked while the doctor has patients).
- **List endpoint** with indexed prefix search, 5 filters, 8 sort orders, page-number pagination, and each doctor's patient count.
- **Lookup endpoints** for dropdowns: distinct hospitals, and doctor options (id + name).
- **Shared building blocks** reused by patients and the dashboard: enums, search keys, pagination, Zod field schemas.
- **`npm run db:explain`**: shows which index each query uses.

## Files

### Created
```
backend/src/
├── constants/enums.ts               fixed value lists (specializations, statuses, conditions, genders)
├── lib/
│   ├── search-key.ts                build search tokens + turn a search string into an index-friendly filter
│   ├── pagination.ts                skip calculation + { data, meta } response shape
│   └── schemas.ts                   reusable Zod fields (id, pagination, dates, email, phone, name…)
├── modules/
│   ├── doctors/
│   │   ├── doctor.model.ts          Doctor schema, searchKey hook, indexes
│   │   ├── doctors.schema.ts        Zod: create / update / list query / options query
│   │   ├── doctors.service.ts       queries and business rules
│   │   ├── doctors.controller.ts    HTTP layer
│   │   └── doctors.routes.ts        /api/doctors routes (admin only)
│   └── patients/
│       └── patient.model.ts         Patient schema, searchKey hook, indexes
└── scripts/explain-queries.ts       npm run db:explain
backend/tests/doctors.test.ts        22 tests
```

### Changed
| File | Change | Why |
|---|---|---|
| `src/routes.ts` | mounts `doctorsRouter` at `/api/doctors` | |
| `src/middleware/error-handler.ts` | keeps **one validation message per field** | forms show one message per input |
| `src/modules/auth/password.ts` | bcrypt cost 4 when `NODE_ENV=test` | every doctor test logs in; keeps the suite fast |
| `tests/setup.ts` | builds indexes before tests; small cache + 60 s start timeout for the test DB | unique-email tests need the index; slow disks |
| `tests/helpers.ts` | `doctorPayload()` and `insertPatients()` fixtures | shared by doctor (and later patient) tests |
| `package.json` | `db:explain` script | |
| `.gitignore` | ignores `.tmp/` | local test temp files and logs |

## How a list request flows
```
GET /api/doctors?search=oka&specialization=Neurology&page=1&limit=10
  │
  ├─ doctors.routes.ts       requireAuth → requireRole('admin')
  ├─ doctors.controller.ts   handler({ query: listDoctorsQuerySchema })
  │                            "1" → 1, empty values dropped, sort whitelisted, ranges checked
  └─ doctors.service.ts      listDoctors(query)
        buildFilter()  →  { searchKey: { $all: [/^oka/] }, specialization: 'Neurology' }
        │
        ├─ query 1 ┐ Promise.all   find(filter).select(fields).sort(...).skip(0).limit(10).lean()
        ├─ query 2 ┘ (parallel)    countDocuments(filter)
        └─ query 3                 aggregate: count patients for these ≤10 doctor ids in one $group
        │
        └─ { data: [...doctors with patientCount], meta: { page, limit, total, totalPages } }
```
Always **3 queries**, whatever the page size.

## Suggested reading order
1. `constants/enums.ts`: the vocabulary
2. `lib/search-key.ts`: the search idea (read the top comment)
3. `modules/doctors/doctor.model.ts`: schema, hook, indexes
4. `lib/schemas.ts` → `modules/doctors/doctors.schema.ts`: validation
5. `modules/doctors/doctors.service.ts`: **the core**: `buildFilter`, `listDoctors`, `countPatientsByDoctor`, `deleteDoctor`
6. `doctors.controller.ts`, `doctors.routes.ts`
7. `modules/patients/patient.model.ts`
8. `scripts/explain-queries.ts`, then run `npm run db:explain`
9. `tests/doctors.test.ts`

---

## Key concepts in this module

### 1. Indexed prefix search (`lib/search-key.ts`)
The obvious approach, `{ name: /oka/i }`, is **case-insensitive and unanchored**, so MongoDB must read every document. Instead:
1. On every save, the doctor gets `searchKey: ["dr", "lena", "okafor", "lena.okafor@stmary.org", "15551234567"]` (lowercased name words, full email, phone digits).
2. A search for `"Oka"` becomes `{ searchKey: { $all: [/^oka/] } }`: lowercase, **anchored** (`^`) and case-sensitive. MongoDB turns `/^oka/` into an index range (`"oka"` up to `"okb"`) on the `searchKey` index.
3. Several words (`"lena oka"`) must all match (`$all`). A phone-looking term (`"555-987"`) is reduced to digits.
4. `escapeRegex` makes user input like `.*(` plain text, so it's not a regex attack and doesn't crash.

Because `searchKey` is an **array**, its index is a *multikey index* (one entry per token). That's why a surname matches just as well as a first name.

### 2. Indexes follow the ESR rule (`doctor.model.ts`)
For `find({ specialization: 'Cardiology' }).sort({ createdAt: -1, _id: -1 })`, the index `{ specialization: 1, createdAt: -1, _id: -1 }` lets MongoDB jump to "Cardiology" (**E**quality), read entries already in date order (**S**ort), and stop after 10. No in-memory sort, no reading extra documents. **R**ange fields (date ranges) go last.

### 3. Stable pagination with an `_id` tiebreaker
Doctors inserted in the same millisecond have identical `createdAt`. Sorting on `createdAt` alone would let MongoDB return ties in any order, so a doctor could appear on page 1 and again on page 2. Every sort ends with `_id` (unique), so the order is always the same, and the indexes include `_id` so that sort is still served by the index.

### 4. No N+1 for patient counts (`countPatientsByDoctor`)
Naive version: for each of 10 doctors, `countDocuments({ doctorId })`, which is 10 extra queries per page. Instead, one aggregation:
```js
[{ $match: { doctorId: { $in: pageIds } } }, { $group: { _id: '$doctorId', count: { $sum: 1 } } }]
```
It's served by the `{ doctorId, admissionDate }` index, and the results are merged in JS from a `Map`.

### 5. `.lean()` and projections
`.lean()` returns plain objects instead of full Mongoose documents (much less memory and CPU). `.select(DOCTOR_FIELDS)` fetches only the fields the API returns. `toDoctorDto()` then lists fields explicitly, so internal fields (`searchKey`, `__v`) can never leak, even from a freshly created document.

### 6. Why update uses load + save (`updateDoctor`)
`findOneAndUpdate` skips document hooks and only validates the changed fields if asked. Loading the doc, `doc.set(input)`, then `doc.save()` runs **full validation and the `searchKey` hook**, so renaming a doctor updates search immediately (verified: `?search=mensah` found the renamed doctor).

### 7. The `.partial()` default trap (`doctors.schema.ts`)
If `status` had `.default('active')` in the shared fields, `updateSchema = fields.partial()` would **fill in `status: 'active'` on every update** and silently reactivate doctors on leave. So defaults are added only to the create schema; the update schema has none. A test ("updates only the given fields") guards this.

### 8. Query-string hygiene (`lib/schemas.ts`)
- `optionalQuery()`: `?status=` (a cleared filter) means "not set" instead of failing validation.
- `z.coerce.number()`: query values are strings, so `"10"` becomes `10`.
- `sort` is a whitelist, so `?sort=password` is a 400.
- `rangeIsOrdered`: `joinedFrom` after `joinedTo` is a 400 with a clear message.
- Operator keys like `?status[$ne]=active` are just unknown keys under Express 5's simple parser, and Zod drops them (tested).

### 9. Delete guard
`deleteDoctor` counts patients first and returns `409 DOCTOR_HAS_PATIENTS` with `details.patientCount`, so the UI can say "This doctor still has 3 patients". Known limit: without a transaction, a patient created in the same instant could slip through. That's acceptable for an admin tool and noted in the context doc.

---

## File by file (short)
| File | Main exports | Notes |
|---|---|---|
| `constants/enums.ts` | `SPECIALIZATIONS`, `DOCTOR_STATUSES`, `CONDITIONS`, `PATIENT_STATUSES`, `GENDERS` + types | `as const` arrays, so the types are derived from the values |
| `lib/search-key.ts` | `buildSearchKey`, `searchKeyFilter`, `escapeRegex` | max 5 search terms; unicode-aware word split |
| `lib/pagination.ts` | `MAX_PAGE_SIZE` (50), `toSkip`, `paginate` | `totalPages` is at least 1 |
| `lib/schemas.ts` | `optionalQuery`, `objectIdSchema`, `idParamsSchema`, `paginationFields`, `searchField`, `dateOnlySchema`, `startOfDay`/`endOfDay`, `pastDateSchema`, `emailSchema`, `phoneSchema`, `personNameSchema`, `rangeIsOrdered` | date filters are inclusive of the whole end day (UTC) |
| `doctors/doctor.model.ts` | `DoctorModel`, `Doctor` type | `pre('validate')` runs on create, save and insertMany |
| `patients/patient.model.ts` | `PatientModel`, `Patient` type | same hook pattern; 5 indexes |
| `doctors/doctors.schema.ts` | `createDoctorSchema`, `updateDoctorSchema`, `listDoctorsQuerySchema`, `doctorOptionsQuerySchema`, `DOCTOR_SORTS` + input types | friendly per-rule messages |
| `doctors/doctors.service.ts` | `listDoctors`, `getDoctor`, `createDoctor`, `updateDoctor`, `deleteDoctor`, `listHospitals`, `listDoctorOptions` | `SORTS` map: sort key → Mongo sort with `_id` |
| `doctors/doctors.controller.ts` | `list`, `getById`, `create`, `update`, `remove`, `hospitals`, `options` | one `handler()` each |
| `doctors/doctors.routes.ts` | `doctorsRouter` | `requireAuth` + `requireRole('admin')` on all; fixed paths before `/:id` |
| `scripts/explain-queries.ts` | — | prints winning plan, rejected plans, keys/docs examined |

---

## Tests (`tests/doctors.test.ts`, 22)
| Group | Proves |
|---|---|
| auth | 401 without a session |
| create | output has `id`, lowercased email, no `searchKey` / `_id` / `__v` · status defaults to active · every invalid field reported (one message each) · duplicate email (any case) → 409 |
| list | pagination meta + stable slices · newest first by default · search by surname / first name / email / phone / multi-word, case-insensitive · regex characters treated as text · every filter, including inclusive end date and empty params · invalid queries → 400 · operator-style keys ignored · correct patient counts per row |
| get | patient count included · 404 unknown · 400 malformed id |
| update | only given fields change (status not reset) and search stays in sync · empty body 400 · duplicate email 409 · 404 |
| delete | 409 with `patientCount` while patients exist → 204 after → then 404 · 404 unknown |
| lookups | hospitals distinct + sorted · options filtered by search |

## Verification on Atlas
16 manual checks passed (QA guide § 2.1). `npm run db:explain` output:
```
✓ index  doctors: default list          IXSCAN(createdAt_-1__id_-1)
✓ index  doctors: search "aisha"        IXSCAN(createdAt_-1__id_-1)   also considered: SORT ← IXSCAN(searchKey_1)
✓ index  doctors: specialization filter IXSCAN(specialization_1_createdAt_-1__id_-1)
✓ index  doctors: status filter         IXSCAN(status_1_createdAt_-1__id_-1)
✓ index  doctors: hospital filter       IXSCAN(hospital_1_createdAt_-1__id_-1)
✓ index  doctors: joined date range     IXSCAN(joinedAt_-1__id_-1)
✓ index  doctors: sort by name          IXSCAN(name_1__id_1)
✓ index  patients: by doctor            IXSCAN(doctorId_1_admissionDate_-1__id_-1)
```
In every case keys examined = documents returned (no wasted reads). With only 2 doctors, the planner served the search by walking the date index (which avoids a sort); the `searchKey` plan was considered and rejected, which is the right choice on tiny data. This is re-checked on seeded data in module 2.3.

## Problems found and fixed during this module
| Problem | Fix |
|---|---|
| `phone: "abc"` produced two errors for one field (Zod 4 runs every check) | merged the phone rules into one check; the error handler now keeps one message per field |
| A missing field said "Invalid input: expected string, received undefined"; negative experience said "Enter years of experience" | explicit messages: "Hospital is required", "Cannot be negative", "Must be 60 or less"… |
| Test MongoDB crashed (`fassert`) | the C: drive has only ~0.3 GB free. Tests now run with temp files on D: (`backend/.tmp`) and a smaller test-DB cache |

## Checkpoint summary (as reported)
- Doctors API complete: CRUD, indexed prefix search, 5 filters, 8 sorts, pagination, patient counts in one aggregation, delete guard, hospitals and options lookups.
- Patient model and indexes are in place for 2.2.
- `npm run db:explain` confirms every query uses an index.
- 44/44 tests pass; type check and production build are clean; 16 manual checks pass on Atlas.
- Environment warning: the C: drive is nearly full (~0.3 GB), which crashed the test database and will affect the frontend install later.
