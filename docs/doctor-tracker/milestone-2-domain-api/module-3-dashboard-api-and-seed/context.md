# Module 2.3 — Dashboard API + Seed: Context

## Endpoint
`GET /api/dashboard/stats?range=30d|90d|12m` (default `30d`)

```json
{
  "data": {
    "range": "30d",
    "generatedAt": "2026-11-14T10:00:00.000Z",
    "kpis": {
      "totalDoctors": 15,
      "activeDoctors": 12,
      "totalPatients": 200,
      "newPatients": { "current": 21, "previous": 17, "deltaPct": 23.5 },
      "avgPatientsPerDoctor": 13.3
    },
    "patientsOverTime": [{ "bucket": "2026-10-16", "count": 1 }],
    "topDoctors": [{ "id": "...", "name": "Dr. ...", "specialization": "Cardiology", "count": 28 }],
    "byCondition": [{ "key": "Hypertension", "count": 34 }],
    "byStatus": [{ "key": "active", "count": 90 }],
    "doctorsBySpecialization": [{ "key": "Cardiology", "count": 3 }]
  }
}
```

## Aggregation notes
- Totals use `countDocuments` (status-filtered counts can use indexes). New-patient windows use `admissionDate` ranges on the `{ admissionDate: -1 }` index.
- Time series: `$match` on the admission range → `$group` by `$dateTrunc({ date, unit, timezone: 'UTC' })` → missing buckets filled with 0 in JS so the chart has no gaps.
- Top doctors: `$group` on `doctorId` (index-ordered) → `$sort { count: -1 }` → `$limit 10` → `$lookup` doctors (10 lookups, not N).
- All pipelines run concurrently via `Promise.all`; the response is cached 60 s per range and cleared on writes.
- **Scalability caveat (README):** the in-memory cache is per instance. With multiple instances, swap in Redis.

## Seed design
- Fixed faker seed, so every run gives identical data (stable screenshots).
- Doctors spread across ~8 hospitals and all specializations, a mix of statuses, `joinedAt` over the last 6 years.
- Patients: weights per doctor (a few busy ones), admission dates over the last 12 months with a winter bump, condition probabilities tied loosely to specialization.
- Wipes `doctors` + `patients` only; the admin is upserted (never duplicated); refresh tokens untouched.
