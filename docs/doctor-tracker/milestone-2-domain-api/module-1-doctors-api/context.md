# Module 2.1 — Doctors API: Context

## Doctor model
| Field | Type | Rules |
|---|---|---|
| name | string | 2–80 chars, trimmed |
| specialization | enum | SPECIALIZATIONS |
| hospital | string | 2–120 chars, trimmed |
| phone | string | 7–20 chars, digits / + / spaces / dashes |
| email | string | valid, lowercased, **unique** |
| status | enum | DOCTOR_STATUSES, default `active` |
| yearsOfExperience | number | integer 0–60 |
| joinedAt | Date | not in the future |
| searchKey | string[] | derived, not client-writable |
| createdAt / updatedAt | Date | timestamps |

## Indexes (doctors)
- `{ email: 1 }` unique
- `{ searchKey: 1 }` (multikey) for prefix search
- `{ specialization: 1, createdAt: -1 }` for specialization filter + default sort
- `{ status: 1, createdAt: -1 }` for status filter + default sort
- `{ hospital: 1 }` for hospital filter and `distinct`
- `{ joinedAt: -1 }` for joined date range / sort
- `{ createdAt: -1 }` for the default list sort

## Patient model indexes (created here, used by 2.1–2.3)
- `{ doctorId: 1, admissionDate: -1 }`: a doctor's patient list, patient counts (`$group` by doctorId), delete guard (`exists`)
- `{ searchKey: 1 }` (multikey)
- `{ condition: 1, admissionDate: -1 }`
- `{ status: 1, admissionDate: -1 }`
- `{ admissionDate: -1 }`: date range filter + dashboard time series

## Endpoints
| Method | Path | Notes |
|---|---|---|
| GET | `/api/doctors` | query: `page, limit, search, specialization, hospital, status, joinedFrom, joinedTo, expMin, expMax, sort` (`-createdAt` default, `name`, `-name`, `-joinedAt`, `joinedAt`, `-yearsOfExperience`) → list + `patientCount` per row |
| GET | `/api/doctors/hospitals` | `{ data: string[] }` distinct sorted |
| GET | `/api/doctors/options` | `?search=` → `{ data: [{ id, name, specialization }] }`, max 20 |
| GET | `/api/doctors/:id` | doctor + `patientCount` |
| POST | `/api/doctors` | 201 |
| PATCH | `/api/doctors/:id` | 200 |
| DELETE | `/api/doctors/:id` | 204 · 409 `DOCTOR_HAS_PATIENTS` (`details.patientCount`) |

## Patient counts without N+1
After fetching the page (≤ 50 doctors): one `Patient.aggregate([{ $match: { doctorId: { $in: ids } } }, { $group: { _id: '$doctorId', count: { $sum: 1 } } }])`, which is covered by the `doctorId` index. The counts are then merged into the rows. Two queries total, regardless of page size.
