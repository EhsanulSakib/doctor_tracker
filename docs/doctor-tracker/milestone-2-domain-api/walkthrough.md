# Milestone 2 — Domain API: Walkthrough

> Index of every file produced in this milestone. Each module's `walkthrough.md` explains its files in detail.
> **Status: complete (2026-11-15).**

| Module | Status | Detailed walkthrough |
|---|---|---|
| 2.1 Doctors API | done | [module-1-doctors-api/walkthrough.md](module-1-doctors-api/walkthrough.md) |
| 2.2 Patients API | done | [module-2-patients-api/walkthrough.md](module-2-patients-api/walkthrough.md) |
| 2.3 Dashboard API + seed | done | [module-3-dashboard-api-and-seed/walkthrough.md](module-3-dashboard-api-and-seed/walkthrough.md) |
| 2.4 Notifications API (added 2026-11-15) | done | [module-4-notifications-api/walkthrough.md](module-4-notifications-api/walkthrough.md) |

## Files added
```
backend/src/
├── constants/enums.ts                 2.1
├── lib/
│   ├── search-key.ts                  2.1
│   ├── pagination.ts                  2.1
│   ├── schemas.ts                     2.1 (+ clearableField in 2.2)
│   └── ttl-cache.ts                   2.3
├── modules/
│   ├── doctors/                       2.1 (model, schema, service, controller, routes)
│   ├── patients/
│   │   ├── patient.model.ts           2.1 (+ name index in 2.2)
│   │   └── patients.{schema,service,controller,routes}.ts   2.2
│   └── dashboard/
│       ├── dashboard.{schema,service,controller,routes}.ts  2.3
│       └── notification.model.ts + notifications.{schema,service,controller,routes}.ts  2.4
└── scripts/
    ├── explain-queries.ts             2.1 (+ patients 2.2, dashboard 2.3)
    ├── seed.ts                        2.3
    └── db-sync.ts                     2.3
backend/tests/doctors.test.ts          2.1
backend/tests/patients.test.ts         2.2
backend/tests/dashboard.test.ts        2.3
backend/tests/notifications.test.ts    2.4
```

## File index
| File | Module | One-line purpose |
|---|---|---|
| `src/constants/enums.ts` | 2.1 | fixed value lists + derived types |
| `src/lib/search-key.ts` | 2.1 | search tokens + anchored-regex filter (index-friendly search) |
| `src/lib/pagination.ts` | 2.1 | `toSkip`, `paginate` → `{ data, meta }` |
| `src/lib/schemas.ts` | 2.1 · 2.2 | reusable Zod fields for ids, pages, dates, email, phone, names; `clearableField` |
| `src/lib/ttl-cache.ts` | 2.3 | in-memory cache with expiry |
| `src/modules/doctors/doctor.model.ts` | 2.1 | Doctor schema, searchKey hook, 8 indexes |
| `src/modules/doctors/doctors.schema.ts` | 2.1 | create / update / list / options validation |
| `src/modules/doctors/doctors.service.ts` | 2.1 | list (3 queries), get, create, update, guarded delete, lookups |
| `src/modules/doctors/doctors.controller.ts` | 2.1 | HTTP layer |
| `src/modules/doctors/doctors.routes.ts` | 2.1 | `/api/doctors/*`, admin only |
| `src/modules/patients/patient.model.ts` | 2.1 | Patient schema, searchKey hook, 6 indexes |
| `src/modules/patients/patients.schema.ts` | 2.2 | create / create-under-doctor / update / list query validation |
| `src/modules/patients/patients.service.ts` | 2.2 | list (3 queries, doctor names via one `$in`), doctor's list, get, create, update + reassign, delete |
| `src/modules/patients/patients.controller.ts` | 2.2 | HTTP layer, incl. nested `/api/doctors/:id/patients` handlers |
| `src/modules/patients/patients.routes.ts` | 2.2 | `/api/patients/*`, admin only |
| `src/modules/dashboard/dashboard.schema.ts` | 2.3 | `range` validation |
| `src/modules/dashboard/dashboard.service.ts` | 2.3 | aligned ranges, 10 parallel index-only queries, zero-fill, 60 s promise cache |
| `src/modules/dashboard/dashboard.controller.ts` | 2.3 | HTTP layer |
| `src/modules/dashboard/dashboard.routes.ts` | 2.3 | `/api/dashboard/stats`, admin only |
| `src/modules/notifications/notification.model.ts` | 2.4 | notification schema: list / unread / cleanup indexes + 30-day TTL |
| `src/modules/notifications/notifications.service.ts` | 2.4 | event copy, failure-isolated `notify()`, list + unread count, mark read / all |
| `src/modules/notifications/notifications.{schema,controller,routes}.ts` | 2.4 | `limit` validation, HTTP layer, `/api/notifications` (admin only) |
| `src/scripts/explain-queries.ts` | 2.1 · 2.2 · 2.3 | `npm run db:explain`: the index behind each query (22 queries) |
| `src/scripts/seed.ts` | 2.3 | `npm run seed`: repeatable demo data |
| `src/scripts/db-sync.ts` | 2.3 | `npm run db:sync`: keep local and Atlas identical |
| `tests/doctors.test.ts` | 2.1 | 22 doctor API tests |
| `tests/patients.test.ts` | 2.2 | 26 patient API tests |
| `tests/dashboard.test.ts` | 2.3 | 8 dashboard tests |
| `tests/notifications.test.ts` | 2.4 | 16 notification tests |

Milestone 1 files changed in 2.1: `routes.ts`, `middleware/error-handler.ts` (one message per field), `modules/auth/password.ts` (fast bcrypt in tests), `tests/setup.ts`, `tests/helpers.ts`, `package.json`, `.gitignore`.
Files changed in 2.2: `routes.ts`, `doctors/doctors.routes.ts` (nested routes), `patients/patient.model.ts` (name index), `lib/schemas.ts` (`clearableField`), `tests/helpers.ts` (`patientPayload`).
Files changed in 2.3: `routes.ts`, `doctors/doctors.service.ts` + `patients/patients.service.ts` (clear the dashboard cache on writes), `config/env.ts` (`SYNC_TARGET_URI`), `.env.example`, `package.json` (`seed`, `db:sync`, faker).
Files changed in 2.4: `constants/enums.ts`, `routes.ts`, `doctors/doctors.service.ts` + `patients/patients.service.ts` (notification events + cleanup), `scripts/seed.ts` (30 notifications), `scripts/db-sync.ts` (copies `notifications`), `scripts/explain-queries.ts` (+3 queries, TTL check).

## Query-optimization patterns introduced here
1. **Anchored lowercase regex on a multikey `searchKey`** instead of `/term/i` scans.
2. **ESR compound indexes** ending in `_id`, so filter + sort + stable paging come from one index.
3. **`find` + `countDocuments` in parallel**, `.lean()` + projection.
4. **One `$group` for per-row counts** (no N+1).
5. **One `$in` for per-row related names** (2.2, what `populate` does, by hand).
6. **Independent queries in parallel**, e.g. a doctor's patient list loads the doctor alongside find + count (2.2); the dashboard's 10 queries (2.3).
7. **Index-only aggregations**: a leading `$sort` on the grouped field gives a covered index scan; filtered counts become `COUNT_SCAN`; unfiltered totals use `estimatedDocumentCount` (2.3).
8. **Limit before `$lookup`**: top-10 first, then fetch 10 names (2.3).
9. **Cache the promise**: one computation for concurrent requests, cleared on writes (2.3).
10. **Verify with `explain()`**: `npm run db:explain`.
11. **TTL index for data that expires**: notifications delete themselves after 30 days (2.4).
12. **Side effects after the main write, never failing it**: notifications are written in try/catch after the save (2.4).
