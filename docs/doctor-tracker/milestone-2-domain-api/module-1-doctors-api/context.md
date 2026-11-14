# Module 2.1 — Doctors API: Context

## Doctor model
| Field | Type | Rules |
|---|---|---|
| name | string | 2–80 chars, trimmed |
| specialization | enum | SPECIALIZATIONS |
| hospital | string | 2–120 chars, trimmed |
| phone | string | 7–20 chars of digits / + / spaces / () / -, at least 7 digits |
| email | string | valid, lowercased, **unique** |
| status | enum | DOCTOR_STATUSES, default `active` |
| yearsOfExperience | number | integer 0–60 |
| joinedAt | Date | `YYYY-MM-DD` or ISO; not in the future, not before 1950 |
| searchKey | string[] | derived in `pre('validate')`; `select: false`; never in responses |
| createdAt / updatedAt | Date | timestamps |

## Indexes (doctors)
| Index | Serves |
|---|---|
| `{ email: 1 }` unique | duplicate-email protection |
| `{ searchKey: 1 }` (multikey) | prefix search |
| `{ createdAt: -1, _id: -1 }` | default list order (newest first) |
| `{ specialization: 1, createdAt: -1, _id: -1 }` | specialization filter + default order |
| `{ status: 1, createdAt: -1, _id: -1 }` | status filter + default order |
| `{ hospital: 1, createdAt: -1, _id: -1 }` | hospital filter + default order; `distinct('hospital')` |
| `{ joinedAt: -1, _id: -1 }` | joined-date range and sort |
| `{ name: 1, _id: 1 }` | sort by name |

Pattern: **E**quality field → **S**ort field → `_id` tiebreaker (ESR rule). `_id` in every sort keeps page boundaries stable when values tie (e.g. docs inserted in the same millisecond). Experience range is applied as a filter on top of whichever index wins (no dedicated index, low value).

## Patient model indexes (created here, used by 2.1–2.3)
- `{ doctorId: 1, admissionDate: -1, _id: -1 }`: a doctor's patient list, per-doctor counts (`$group`), delete guard
- `{ searchKey: 1 }` (multikey)
- `{ admissionDate: -1, _id: -1 }`: default order, date range, dashboard time series
- `{ condition: 1, admissionDate: -1, _id: -1 }`
- `{ status: 1, admissionDate: -1, _id: -1 }`

## Endpoints (all require an admin session)
| Method | Path | Request | Success | Errors |
|---|---|---|---|---|
| GET | `/api/doctors` | query: `page, limit (≤50), search, specialization, hospital, status, joinedFrom, joinedTo, expMin, expMax, sort` | `{ data: Doctor[], meta }` | 400 |
| GET | `/api/doctors/hospitals` | — | `{ data: string[] }` (distinct, A→Z) | |
| GET | `/api/doctors/options` | `?search=` | `{ data: [{ id, name, specialization }] }` (≤ 20, A→Z) | |
| GET | `/api/doctors/:id` | — | `{ data: Doctor }` | 400 bad id, 404 |
| POST | `/api/doctors` | Doctor fields (`status` optional) | 201 `{ data: Doctor }` | 400, 409 `CONFLICT` (`details.fields: ['email']`) |
| PATCH | `/api/doctors/:id` | any subset of fields (≥ 1) | `{ data: Doctor }` | 400, 404, 409 |
| DELETE | `/api/doctors/:id` | — | 204 | 404, 409 `DOCTOR_HAS_PATIENTS` (`details.patientCount`) |

`Doctor` = `{ id, name, specialization, hospital, phone, email, status, yearsOfExperience, joinedAt, createdAt, updatedAt, patientCount }`

`sort` values: `-createdAt` (default), `createdAt`, `name`, `-name`, `-joinedAt`, `joinedAt`, `-yearsOfExperience`, `yearsOfExperience`.

Empty query values (`?status=`) count as "not set". Unknown query keys are ignored.

## Query strategy
- **List:** `find(filter).select(fields).sort(sort).skip().limit().lean()` and `countDocuments(filter)` run in parallel (`Promise.all`).
- **Patient counts:** one `aggregate([$match doctorId ∈ pageIds, $group])` for the whole page, so it's 3 queries total whatever the page size (no N+1).
- **Search:** see `lib/search-key.ts`. Each term becomes an anchored regex on the lowercase `searchKey` tokens; terms are combined with `$all` (every term must match). Phone-like terms are reduced to digits.
- **Update:** `findById` + `set` + `save()` (not `findOneAndUpdate`) so schema validation and the `searchKey` hook always run.
- **Delete guard:** `countDocuments({ doctorId })` → 409 if > 0. Without a transaction, a patient added in the same instant could slip through; acceptable for this app.

## Implementation notes / changes from plan
- Shared Zod building blocks live in `lib/schemas.ts` (reused by patients in 2.2).
- Duplicate email returns the generic 409 `CONFLICT` with `details.fields: ['email']`, which the frontend maps to the email input.
- The error handler now keeps **one message per field** (first issue wins).
- `src/scripts/explain-queries.ts` (`npm run db:explain`) prints each query's winning plan and rejected plans.
