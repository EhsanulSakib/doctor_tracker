# Module 2.3 — Dashboard API + Seed: Tasks

- [ ] [backend] `lib/ttl-cache.ts`: tiny in-memory TTL cache with `get / set / clear`
- [ ] [backend] `dashboard.service.ts`: parse range → `{ from, prevFrom, unit }` (30d → day, 90d → week, 12m → month)
- [ ] [backend] Aggregations run in parallel (`Promise.all`): totals, new patients current vs previous period, patients over time (`$dateTrunc` + zero-fill missing buckets in JS), top-10 doctors by patient count (`$group` → `$sort` → `$limit` → `$lookup` names), by condition, by status, doctors by specialization
- [ ] [backend] `GET /api/dashboard/stats?range=` with Zod validation; result cached 60 s per range
- [ ] [backend] Clear the stats cache on every doctor / patient write (create, update, delete)
- [ ] [backend] `scripts/seed.ts`: faker fixed seed; upsert admin; wipe + insert ~15 doctors and ~200 patients over the last 12 months with uneven distribution (some busier doctors, a seasonal bump); counts as constants at the top; uses `insertMany` and ensures indexes
- [ ] [test] Supertest: stats shape for each range; cache cleared after a write
- [ ] [test] Manual: `npm run seed`, curl stats for 30d / 90d / 12m, `explain()` on the main list queries; record results in the QA guide
