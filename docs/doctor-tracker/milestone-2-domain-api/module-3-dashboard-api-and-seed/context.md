# Module 2.3 — Dashboard API + Seed: Context

## Endpoint
`GET /api/dashboard/stats?range=30d|90d|12m` (default `30d`, empty value = default) · admin only · 400 `range: Use 30d, 90d or 12m`

```json
{
  "data": {
    "range": "30d",
    "generatedAt": "2026-11-15T02:54:40.969Z",
    "period": { "unit": "day", "from": "2026-10-17T00:00:00.000Z", "to": "2026-11-16T00:00:00.000Z", "previousFrom": "2026-09-17T00:00:00.000Z" },
    "kpis": {
      "totalDoctors": 15,
      "activeDoctors": 11,
      "totalPatients": 200,
      "newPatients": { "current": 16, "previous": 11, "deltaPct": 45.5 },
      "avgPatientsPerDoctor": 13.3
    },
    "patientsOverTime": [{ "bucket": "2026-10-17", "count": 1 }],
    "topDoctors": [{ "id": "...", "name": "Dr. ...", "specialization": "Neurology", "count": 33 }],
    "byCondition": [{ "key": "Migraine", "count": 32 }],
    "byStatus": [{ "key": "active", "count": 51 }],
    "doctorsBySpecialization": [{ "key": "Pediatrics", "count": 3 }]
  }
}
```

## Ranges
| Range | Bucket | Buckets | Window (`from`) | Previous period |
|---|---|---|---|---|
| `30d` | day | 30 | today − 29 days (today = the calendar date in `APP_TIMEZONE`, Asia/Dhaka) | the 30 days before |
| `90d` | week (Monday) | 13 | Monday 12 weeks before this week's Monday (85–91 days) | the 13 weeks before |
| `12m` | month | 12 | 1st of the month 11 months ago | the 12 months before |

Windows are whole buckets ending with the current (partial) one, so **`sum(patientsOverTime) === kpis.newPatients.current`** in every range and both periods have the same length. Admission dates are calendar dates stored as UTC midnight; "today" is the date in `APP_TIMEZONE` (Asia/Dhaka), and `period.to` is the start of tomorrow (exclusive), so today's admissions always count, even between 00:00 and 06:00 in Dhaka when UTC is still on the previous day.

## What the range applies to
| Range-based | Snapshot (all current data) |
|---|---|
| `newPatients` (current vs previous), `patientsOverTime` | `totalDoctors`, `activeDoctors`, `totalPatients`, `avgPatientsPerDoctor` (patients ÷ doctors), `topDoctors` (current caseload), `byCondition`, `byStatus`, `doctorsBySpecialization` |

## Response details
- `patientsOverTime`: one entry per bucket, `bucket` = UTC start date `YYYY-MM-DD` (month buckets end in `-01`), empty buckets included with `0`.
- `deltaPct`: one decimal; **`null` when the previous period had 0 admissions** (show "—" / "new", not ∞).
- Breakdowns include **every enum value** (zeros too), so chart categories and colors stay stable. `byCondition` and `doctorsBySpecialization` are sorted by count (ties keep enum order); `byStatus` keeps enum order (`active`, `under_treatment`, `recovered`).
- `topDoctors`: up to 10, sorted by count (ties by id); doctors with 0 patients don't appear.

## Query strategy (10 queries, all in parallel)
| Query | How | Plan (explain on seeded data) |
|---|---|---|
| total doctors / patients | `estimatedDocumentCount()` | collection metadata, no scan |
| active doctors | `countDocuments({ status: 'active' })` | `COUNT_SCAN(status_…)`, 0 docs |
| new patients current / previous | `countDocuments({ admissionDate: range })` | `COUNT_SCAN(admissionDate_…)`, 0 docs |
| patients over time | `$match` range → `$group` by `$dateTrunc` | `PROJECTION_COVERED ← IXSCAN(admissionDate_…)`, 0 docs |
| top doctors | `$sort doctorId` → `$group` → `$sort count` → `$limit 10` → `$lookup` doctors | covered `IXSCAN(doctorId_…)`, 0 docs; lookup for 10 rows |
| by condition / status / specialization | `$sort field` → `$group` | covered `IXSCAN(<field>_…)`, 0 docs |

The leading **`$sort` on the grouped field** is what turns a full-collection `$group` (COLLSCAN, every document loaded) into a covered index scan (only index keys read). Found with explain during this module.

## Cache
- `TtlCache` (`lib/ttl-cache.ts`), 60 s per range, in memory.
- The **promise** is cached, so concurrent requests on a cold cache share one computation (tested); a failed computation is removed immediately.
- `clearDashboardCache()` runs after every successful doctor / patient create, update and delete (services). Writes made outside the API (seed, sync, mongosh) show up after ≤ 60 s.
- **Scalability caveat (README):** the cache is per process. With several API instances, a write clears only its own instance's cache; swap in Redis.

## Seed (`npm run seed`)
- **Bangladesh data** (user requirement): Bangladeshi names (romanized; Muslim and Hindu naming, female surnames like Akter / Begum / Khatun), fictional hospitals in Bangladeshi cities, `+880 1XXX-XXXXXX` mobile numbers (operator prefixes 013–019), emails on reserved `example.*` domains.
- Fixed faker seed (`20261114`): the same 15 doctors and 200 patients every run; dates are relative to today in Asia/Dhaka, so 30d / 90d / 12m always have data.
- Doctors: every specialization at least once, extras weighted toward common ones (General Medicine, Cardiology, Pediatrics…); 8 fictional hospitals (Dhanmondi Lakeview Hospital, Gulshan Crescent Medical Centre, Uttara Northpoint Hospital, Mirpur Shapla Clinic, Chattogram Bayview Hospital, Sylhet Tea Valley Medical, Rajshahi Padma Care Centre, Khulna Rupsha General Hospital; Dhaka weighted ×2); 11 active / 3 on leave / 1 inactive; joined 1–6 years ago; `@<hospital>.example.org` emails.
- Patients: uneven workloads (a few busy doctors, the inactive one with few); admissions over the 12m window with Bangladesh's seasonal pattern: a monsoon peak (Jul–Sep, dengue season) and a winter rise (current month weighted by how much of it has passed); 70% get a condition typical for their doctor's specialization; pediatric patients are 1–17 (never gender "other"); status by admission age (older → mostly recovered); ~60% have an email, ~40% notes (incl. "Advised ORS and plenty of fluids", "Platelet count to be repeated in 48 hours").
- Wipes `doctors` + `patients` only; the admin is upserted (never duplicated); refresh tokens untouched. Refuses `NODE_ENV=production` unless `--force`.

## Local database + Atlas sync (added in this module)
The user asked to work on a local MongoDB while keeping Atlas in sync.
- `MONGODB_URI` → local MongoDB service (`mongodb://127.0.0.1:27017/doctor_tracker`, MongoDB 8.3.1 on this machine).
- `SYNC_TARGET_URI` → Atlas (optional env var, validated in `config/env.ts`).
- `npm run db:sync` (`scripts/db-sync.ts`): preview by default; `--yes` pushes local → Atlas, `--pull --yes` pulls. Copies `users`, `doctors`, `patients` exactly (same `_id`, timestamps, `searchKey`) in batches of 1000, clears the destination's `refreshtokens`, then `syncIndexes()` on the destination. Refuses when both URIs point at the same database; never prints URIs. Not transactional: re-run on failure.
- **Network quirk:** Node's DNS (c-ares) asks the router `192.168.1.1` directly, which returns a malformed answer for SRV queries (`querySrv EBADRESP`); Windows' own resolver works. So `SYNC_TARGET_URI` uses Atlas's standard `mongodb://host1,host2,host3/…?replicaSet=…&tls=true&authSource=admin` form. The original SRV string stays in `.env` as a comment for Render (where SRV works).

## Changes after verification (2026-11-15, user request: Bangladesh)
- Seed rewritten for Bangladesh (above); local DB re-seeded and synced to Atlas.
- `APP_TIMEZONE` env (default `Asia/Dhaka`, validated as an IANA zone) + `lib/dates.ts` (`todayInAppTimezone`, `todayAsDateOnly`).
- `pastDateSchema` compares a `YYYY-MM-DD` value with today in Dhaka (timestamps still with now). Before, a patient admitted "today" between 00:00 and 06:00 Dhaka time was rejected as "in the future".
- `periodFor` builds windows from today in Dhaka; queries use `$lt: to` (start of tomorrow).
- Tests: `tests/dates.test.ts` (3, faked clock at 02:00 Dhaka) + a Dhaka-boundary `periodFor` test; test fixtures use Bangladeshi hospital / phone defaults. 82/82.

## Implementation notes / changes from plan
- Ranges are aligned to whole buckets (90d = 13 weeks) so the chart and the KPI always agree; `period` added to the response so the frontend can label axes.
- `deltaPct` is `null` (not 0 or ∞) without a previous period.
- Breakdowns are zero-filled with every enum value.
- Group queries use a leading `$sort` for covered index scans (not in the plan; found with explain).
- `explain-queries.ts` now explains aggregations (handles both explain formats), covers the 7 dashboard queries, and takes its search terms from real data.
- Seed extras weighted toward common specializations: with uniform picks, 3 of 5 extras landed in Oncology and "Other" became the top condition (55/200).
- Local DB + `db:sync` were added at the user's request (not in the original plan).
