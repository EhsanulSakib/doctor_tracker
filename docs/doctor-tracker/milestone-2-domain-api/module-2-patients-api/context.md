# Module 2.2 — Patients API: Context

## Patient model
| Field | Type | Rules |
|---|---|---|
| name | string | 2–80 chars |
| age | number | integer 0–120 |
| gender | enum | GENDERS |
| phone | string | 7–20 chars |
| email | string? | optional, valid, lowercased (not unique) |
| condition | enum | CONDITIONS |
| status | enum | PATIENT_STATUSES, default `active` |
| admissionDate | Date | not in the future |
| notes | string? | ≤ 1000 chars |
| doctorId | ObjectId → Doctor | required, indexed |
| searchKey | string[] | derived |
| createdAt / updatedAt | Date | timestamps |

## Endpoints
| Method | Path | Notes |
|---|---|---|
| GET | `/api/patients` | query: `page, limit, search, condition, status, gender, doctorId, admittedFrom, admittedTo, sort` (`-admissionDate` default, `admissionDate`, `name`, `-name`, `-createdAt`) → rows include `doctor: { id, name, specialization }` |
| GET | `/api/patients/:id` | |
| POST | `/api/patients` | body includes `doctorId` → 201 · 404 `DOCTOR_NOT_FOUND` |
| PATCH | `/api/patients/:id` | may change `doctorId` (reassign) |
| DELETE | `/api/patients/:id` | 204 · 404 |
| GET | `/api/doctors/:id/patients` | same query as `/api/patients` without `doctorId` · 404 if the doctor is missing |
| POST | `/api/doctors/:id/patients` | body without `doctorId` → 201 |

## Query notes
- `doctorId` filter + `-admissionDate` sort uses `{ doctorId: 1, admissionDate: -1 }` exactly (equality, then sort).
- Doctor names come from `populate` (one extra `$in` query for the page) rather than `$lookup` in the main query, so the count query stays a cheap `countDocuments`.
