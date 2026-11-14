# Milestone 2 — Domain API: Walkthrough

> Index of every file produced in this milestone. Each module's `walkthrough.md` explains its files in detail.

| Module | Status | Detailed walkthrough |
|---|---|---|
| 2.1 Doctors API | done | [module-1-doctors-api/walkthrough.md](module-1-doctors-api/walkthrough.md) |
| 2.2 Patients API | not started | — |
| 2.3 Dashboard API + seed | not started | — |

## Files added so far
```
backend/src/
├── constants/enums.ts                 2.1
├── lib/
│   ├── search-key.ts                  2.1
│   ├── pagination.ts                  2.1
│   └── schemas.ts                     2.1
├── modules/
│   ├── doctors/                       2.1 (model, schema, service, controller, routes)
│   └── patients/patient.model.ts      2.1 (endpoints in 2.2)
└── scripts/explain-queries.ts         2.1
backend/tests/doctors.test.ts          2.1
```

## File index
| File | Module | One-line purpose |
|---|---|---|
| `src/constants/enums.ts` | 2.1 | fixed value lists + derived types |
| `src/lib/search-key.ts` | 2.1 | search tokens + anchored-regex filter (index-friendly search) |
| `src/lib/pagination.ts` | 2.1 | `toSkip`, `paginate` → `{ data, meta }` |
| `src/lib/schemas.ts` | 2.1 | reusable Zod fields for ids, pages, dates, email, phone, names |
| `src/modules/doctors/doctor.model.ts` | 2.1 | Doctor schema, searchKey hook, 8 indexes |
| `src/modules/doctors/doctors.schema.ts` | 2.1 | create / update / list / options validation |
| `src/modules/doctors/doctors.service.ts` | 2.1 | list (3 queries), get, create, update, guarded delete, lookups |
| `src/modules/doctors/doctors.controller.ts` | 2.1 | HTTP layer |
| `src/modules/doctors/doctors.routes.ts` | 2.1 | `/api/doctors/*`, admin only |
| `src/modules/patients/patient.model.ts` | 2.1 | Patient schema, searchKey hook, 5 indexes |
| `src/scripts/explain-queries.ts` | 2.1 | `npm run db:explain`: shows the index behind each query |
| `tests/doctors.test.ts` | 2.1 | 22 doctor API tests |

Milestone 1 files changed in 2.1: `routes.ts`, `middleware/error-handler.ts` (one message per field), `modules/auth/password.ts` (fast bcrypt in tests), `tests/setup.ts`, `tests/helpers.ts`, `package.json`, `.gitignore`.

## Query-optimization patterns introduced here
1. **Anchored lowercase regex on a multikey `searchKey`** instead of `/term/i` scans.
2. **ESR compound indexes** ending in `_id`, so filter + sort + stable paging come from one index.
3. **`find` + `countDocuments` in parallel**, `.lean()` + projection.
4. **One `$group` for per-row counts** (no N+1).
5. **Verify with `explain()`**: `npm run db:explain`.
