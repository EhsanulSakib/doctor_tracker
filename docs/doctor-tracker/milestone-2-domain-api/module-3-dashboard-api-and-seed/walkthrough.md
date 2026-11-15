# Module 2.3 — Dashboard API + Seed: Walkthrough

> A guide to every file this module created or changed, the ideas behind it, and how it was verified.
> Status: **done** (2026-11-15) · 8 new automated tests (78 total) · seed repeatable · every dashboard query reads 0 documents · local and Atlas identical.

## What this module built
- **`GET /api/dashboard/stats?range=30d|90d|12m`**: KPIs with change vs the previous period, admissions over time, top-10 doctors, condition / status / specialization breakdowns. One endpoint, 10 queries in parallel, cached 60 s per range, cleared on every write.
- **`npm run seed`**: 1 admin, 15 doctors, 200 patients with realistic, uneven, repeatable data.
- **Local MongoDB as the working database** and **`npm run db:sync`** to keep Atlas identical (requested during this module).
- `npm run db:explain` now covers the dashboard aggregations.

## Files

### Created
```
backend/src/
├── lib/ttl-cache.ts                       in-memory cache with expiry
├── modules/dashboard/
│   ├── dashboard.schema.ts                range validation (30d | 90d | 12m)
│   ├── dashboard.service.ts               ranges, 10 parallel queries, cache, clearDashboardCache()
│   ├── dashboard.controller.ts            HTTP layer
│   └── dashboard.routes.ts                /api/dashboard/stats (admin only)
└── scripts/
    ├── seed.ts                            npm run seed
    └── db-sync.ts                         npm run db:sync
backend/tests/dashboard.test.ts            8 tests
```

### Changed
| File | Change | Why |
|---|---|---|
| `src/routes.ts` | mounts `dashboardRouter` at `/api/dashboard` | |
| `src/modules/doctors/doctors.service.ts` | `clearDashboardCache()` after create / update / delete | stats never stale after a write |
| `src/modules/patients/patients.service.ts` | same, after create (both routes) / update / delete | |
| `src/scripts/explain-queries.ts` | explains aggregations, 7 dashboard queries, search terms from real data | verify the dashboard's index use |
| `src/config/env.ts` | optional `SYNC_TARGET_URI` | used by `db:sync` |
| `.env.example` | documents `SYNC_TARGET_URI` and the SRV workaround | |
| `package.json` / lock | `seed`, `db:sync` scripts; `@faker-js/faker` 10.6.0 (dev) | |
| `backend/.env` (git-ignored) | `MONGODB_URI` → local; `SYNC_TARGET_URI` → Atlas (standard form); SRV string kept as a comment. Backup: `.env.backup-2026-11-15` | local working DB, synced Atlas |

## How a stats request flows
```
GET /api/dashboard/stats?range=90d
  │
  ├─ dashboard.routes.ts       requireAuth → requireRole('admin')
  ├─ dashboard.controller.ts   handler({ query: dashboardStatsQuerySchema })   "" → '30d', '7d' → 400
  └─ dashboard.service.ts      getDashboardStats('90d')
        cache hit? ──yes──▶ same promise as last time (≤ 60 s old)
        │ no
        periodFor('90d')  →  { unit: 'week', buckets: 13, from: Mon 12 weeks ago, previousFrom: 13 weeks before that }
        │
        Promise.all ─┬─ estimatedDocumentCount ×2       (metadata)
                     ├─ countDocuments ×3               (COUNT_SCAN)
                     ├─ $dateTrunc series               (covered index scan) → zero-fill 13 buckets in JS
                     ├─ top doctors                     (covered scan → 10 rows → $lookup names)
                     └─ $group ×3 condition/status/spec (covered index scans) → zero-fill every enum value
        │
        └─ { range, generatedAt, period, kpis, patientsOverTime, topDoctors, byCondition, byStatus, doctorsBySpecialization }
```
Any doctor / patient write through the API → `clearDashboardCache()` → the next request recomputes.

## Suggested reading order
1. `modules/dashboard/dashboard.service.ts` top to bottom: `RANGES` → `truncate` / `addUnits` / `periodFor` → `patientsOverTime` → `indexOrderedGroup` / `topDoctors` / `countBy` → `computeStats` → cache
2. `lib/ttl-cache.ts`
3. `dashboard.schema.ts`, `dashboard.controller.ts`, `dashboard.routes.ts`
4. `tests/dashboard.test.ts`
5. `scripts/seed.ts`
6. `scripts/db-sync.ts`
7. Run `npm run db:explain` and read the `dashboard:` lines

---

## Key concepts in this module

### 1. Windows made of whole buckets
"Last 90 days" with weekly bars has an awkward first bar: day 90 lands mid-week, so that bar would be partial and the chart total wouldn't match a "90 days" KPI. Instead each range is *N whole buckets ending with the current one*: 30 days, 13 Monday-weeks, 12 calendar months. Then:
- the chart's total **equals** `newPatients.current`, always (asserted in tests and manually);
- the previous period is exactly N buckets too, so the comparison is fair.

### 2. `$dateTrunc` + zero-fill
`$dateTrunc: { date: '$admissionDate', unit: 'week', startOfWeek: 'monday', timezone: 'UTC' }` maps each admission to the start of its bucket, and `$group` counts per bucket. MongoDB only returns buckets that **have** admissions, so the service builds the full list of bucket starts (`addUnits(from, unit, i)`) and fills the missing ones with `0`. Otherwise the line chart would join Monday to Thursday as if they were neighbours.

### 3. Index-only aggregations (found with explain)
`[{ $group: { _id: '$condition', count: { $sum: 1 } } }]` has no filter, so MongoDB loads **every document** (COLLSCAN). Adding `{ $sort: { condition: 1 } }` first changes nothing in the result, but lets the planner walk the index that starts with `condition`, and since only `condition` is needed, it never loads a document (`PROJECTION_COVERED`, *docs examined 0*). Same trick for `doctorId`, `status`, `specialization`. With 200 patients it saves microseconds; with millions it's the difference between reading the collection and reading a small index.

Counts work the same way: `countDocuments({ status: 'active' })` becomes a `COUNT_SCAN` over the status index. Unfiltered totals use `estimatedDocumentCount()`, which reads collection metadata instead of counting.

### 4. Top-10 without N lookups
Group patients by `doctorId` → sort by count → **limit 10** → *then* `$lookup` the doctor names. The lookup runs for 10 rows, not 200 patients, and doctors without patients simply don't appear.

### 5. Caching a promise
The cache stores the **promise** of the result, not the result. If three requests arrive while the cache is cold, the first starts the computation and the other two get the same promise, so the queries run once (tested with a spy on `estimatedDocumentCount`). A rejected promise is removed right away so an error isn't cached for 60 s. Writes call `clearDashboardCache()`; anything written outside the API shows up within 60 s.

### 6. A seed that looks real and never changes
`faker.seed(20261114)` makes faker's random sequence fixed: same names, same emails, same distribution on every run (verified by hashing two runs). Dates are computed from *today*, so the dashboard always has recent data. Realism comes from weights, not uniform randomness: busy and quiet doctors, a winter peak, conditions typical for each specialty, older admissions mostly recovered. The first version picked extra specializations uniformly; 3 of 5 became Oncology and "Other" dominated the condition chart, so extras are now weighted toward common specialties.

### 7. Keeping local and Atlas in sync (`db:sync`)
Work happens on the local MongoDB; Atlas is the shared copy. `db:sync` replaces the destination's `users`, `doctors`, `patients` with exact copies (same `_id`s, so references between patients and doctors stay valid), then runs `syncIndexes()` so the destination has the schema's indexes. It previews unless you pass `--yes`, refuses to sync a database onto itself, and never prints connection strings. Refresh tokens are sessions of one database, so they're cleared instead of copied.

Why the Atlas URI isn't `mongodb+srv://`: Node resolves SRV records by asking the router (`192.168.1.1`) directly, and this router returns a malformed answer (`querySrv EBADRESP`), while Windows' own resolver works. The standard `mongodb://host1,host2,host3/?replicaSet=…` form needs no SRV lookup.

---

## File by file (short)
| File | Main exports | Notes |
|---|---|---|
| `lib/ttl-cache.ts` | `TtlCache<V>` (`get`, `set`, `delete`, `clear`) | expired entries removed on read |
| `dashboard/dashboard.schema.ts` | `dashboardStatsQuerySchema`, `DASHBOARD_RANGES`, `DashboardRange` | |
| `dashboard/dashboard.service.ts` | `getDashboardStats`, `clearDashboardCache`, `periodFor`, `DashboardStats` | `RANGES`, `TOP_DOCTORS_LIMIT`, `CACHE_TTL_MS` constants |
| `dashboard/dashboard.controller.ts` | `stats` | |
| `dashboard/dashboard.routes.ts` | `dashboardRouter` | admin only |
| `scripts/seed.ts` | — | `SEED`, `DOCTOR_COUNT`, `PATIENT_COUNT` at the top |
| `scripts/db-sync.ts` | — | `--yes`, `--pull` |

## Tests (`tests/dashboard.test.ts`, 8)
| Test | Proves |
|---|---|
| access | 401 without a session |
| validation | `7d` → 400 with a clear message; missing / empty range → `30d` |
| empty database | every range: zero KPIs, `deltaPct: null`, full bucket list (30 / 13 / 12) of zeros, every enum key present, no top doctors |
| numbers | exact KPIs (incl. `deltaPct: 100`, avg 1.3), today's bucket and a 3-days-ago bucket, first bucket = 29 days ago, chart sum = KPI, top doctors with names and counts (doctor without patients absent), sorted breakdowns |
| 90d / 12m | 13 Monday buckets, 12 month buckets, sums match the KPI, `previous` 0 → `deltaPct: null` |
| `periodFor` | exact windows for a Sunday (30d / 90d / 12m), no month overflow from the 31st |
| cache cleared on writes | direct DB insert → still cached (same `generatedAt`); patient create, patient delete, doctor update via API → fresh numbers |
| cache per range, shared | three parallel 30d requests → one computation; 12m computed separately |

## Verification
- `tsc` + build clean; `vitest run` 78/78.
- Seed run twice: identical data. Local stats for 30d / 90d / 12m: sums match KPIs; cached ≈ 2 ms.
- `npm run db:explain` (local and Atlas): 22 queries, all indexed; dashboard ones:
```
✓ dashboard: active doctors (count)          GROUP ← COUNT_SCAN(status_1_createdAt_-1__id_-1)                      keys 11  · docs 0
✓ dashboard: new patients, 30d (count)       GROUP ← COUNT_SCAN(admissionDate_-1__id_-1)                           keys 16  · docs 0
✓ dashboard: patients over time (30d)        GROUP ← PROJECTION_COVERED ← IXSCAN(admissionDate_-1__id_-1)          keys 16  · docs 0
✓ dashboard: top doctors (group by doctor)   GROUP ← PROJECTION_COVERED ← IXSCAN(doctorId_1_admissionDate_-1__id_-1) keys 200 · docs 0
✓ dashboard: patients by condition           GROUP ← PROJECTION_COVERED ← IXSCAN(condition_1_admissionDate_-1__id_-1) keys 200 · docs 0
✓ dashboard: patients by status              GROUP ← PROJECTION_COVERED ← IXSCAN(status_1_admissionDate_-1__id_-1)  keys 200 · docs 0
✓ dashboard: doctors by specialization       GROUP ← PROJECTION_COVERED ← IXSCAN(specialization_1_createdAt_-1__id_-1) keys 15 · docs 0
```
- `db:sync -- --yes` → Atlas: sha256 of every document in users / doctors / patients identical to local, same indexes. Same stats served from Atlas (cold ≈ 0.43 s, cached ≈ 2 ms).

## Problems found and fixed during this module
| Problem | Fix |
|---|---|
| Group queries did a COLLSCAN | leading `$sort` on the grouped field → covered index scans |
| `countDocuments().explain()` returns a number in Mongoose | explain script shows counts as `$match` + `$count` pipelines (same plan) |
| Seed: "Other" was the top condition (Oncology over-represented) | weighted extra specializations |
| Node can't resolve the Atlas SRV record on this network | standard (non-SRV) URI in `SYNC_TARGET_URI` |

## Checkpoint summary
- Dashboard API complete: 3 aligned ranges, 10 parallel index-only queries, zero-filled series and breakdowns, 60 s promise cache cleared on writes.
- Repeatable realistic seed; local MongoDB is the working DB and Atlas is an identical synced copy (`npm run db:sync`).
- 78/78 tests; every list and dashboard query uses an index.
- **Milestone 2 (Domain API) is complete.** Next: **Milestone 3: frontend foundation** (3.1 scaffold + design system).
