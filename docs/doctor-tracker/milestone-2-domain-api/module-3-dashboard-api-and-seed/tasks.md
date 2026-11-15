# Module 2.3 — Dashboard API + Seed: Tasks

- [x] [backend] `lib/ttl-cache.ts`: tiny in-memory TTL cache with `get / set / delete / clear`
- [x] [backend] `dashboard.service.ts`: parse range → `{ from, previousFrom, unit }` (30d → 30 days, 90d → 13 weeks, 12m → 12 months; aligned to whole buckets)
- [x] [backend] Aggregations run in parallel (`Promise.all`, 10 queries): totals, new patients current vs previous period, patients over time (`$dateTrunc` + zero-fill missing buckets in JS), top-10 doctors by patient count (`$group` → `$sort` → `$limit` → `$lookup` names), by condition, by status, doctors by specialization
- [x] [backend] `GET /api/dashboard/stats?range=` with Zod validation; result cached 60 s per range (the promise is cached, so concurrent requests share one computation)
- [x] [backend] Clear the stats cache on every doctor / patient write (create, update, delete)
- [x] [backend] `scripts/seed.ts` (`npm run seed`): faker fixed seed; upsert admin; wipe + insert 15 doctors and 200 patients over the dashboard's 12-month window with uneven distribution (busy doctors, winter bump, specialty-typical conditions, status by admission age); counts as constants at the top; `insertMany`; syncs indexes; refuses `NODE_ENV=production` without `--force`
- [x] [test] Supertest (8 tests): access + validation, empty-DB shape per range, exact KPIs / series / top doctors / breakdowns, weekly + monthly buckets, `periodFor` date maths, cache hit + cleared by patient create / delete and doctor update, per-range cache + shared concurrent computation
- [x] [test] Manual: `npm run seed` (twice: identical), curl stats for 30d / 90d / 12m, `npm run db:explain` (22 queries, all indexed; dashboard queries read 0 documents); recorded in the QA guide
- [x] [backend] Dashboard group queries start with `$sort` on the grouped field → covered index scans instead of COLLSCAN (found with explain)
- [x] [infra] Local MongoDB as the working DB + `scripts/db-sync.ts` (`npm run db:sync`) to keep Atlas identical (see context.md)
