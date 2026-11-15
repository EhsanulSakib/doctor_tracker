# Module 2.2 — Patients API: Context

## Patient model
| Field | Type | Rules |
|---|---|---|
| name | string | 2–80 chars |
| age | number | integer 0–120 |
| gender | enum | GENDERS |
| phone | string | 7–20 chars, at least 7 digits (same rule as doctors) |
| email | string? | optional, valid, lowercased (not unique). `""` / `null` = no email |
| condition | enum | CONDITIONS |
| status | enum | PATIENT_STATUSES, default `active` |
| admissionDate | Date | `YYYY-MM-DD` or ISO; not in the future, not before 1950 |
| notes | string? | ≤ 1000 chars. `""` / `null` = no notes |
| doctorId | ObjectId → Doctor | required, must exist, indexed |
| searchKey | string[] | derived (name words, email, phone digits); `select: false`; never in responses |
| createdAt / updatedAt | Date | timestamps |

## Indexes (patients)
| Index | Serves |
|---|---|
| `{ doctorId: 1, admissionDate: -1, _id: -1 }` | a doctor's patient list, per-doctor counts, doctor delete guard |
| `{ searchKey: 1 }` (multikey) | prefix search |
| `{ admissionDate: -1, _id: -1 }` | default order, admission date range and sort, dashboard time series |
| `{ condition: 1, admissionDate: -1, _id: -1 }` | condition filter + default order |
| `{ status: 1, admissionDate: -1, _id: -1 }` | status filter + default order |
| `{ name: 1, _id: 1 }` | **new in 2.2**: `name` / `-name` sorts (walked backwards for `-name`) |

No index for `gender` (3 values, low selectivity: applied on top of whichever index wins) or the rare `-createdAt` sort (in-memory sort of the filtered set).

## Endpoints (all require an admin session)
| Method | Path | Request | Success | Errors |
|---|---|---|---|---|
| GET | `/api/patients` | query: `page, limit (≤50), search, condition, status, gender, doctorId, admittedFrom, admittedTo, sort` | `{ data: Patient[], meta }` | 400 |
| GET | `/api/patients/:id` | — | `{ data: Patient }` | 400 bad id, 404 |
| POST | `/api/patients` | Patient fields incl. `doctorId` (`status`, `email`, `notes` optional) | 201 `{ data: Patient }` | 400, 404 `DOCTOR_NOT_FOUND` (`details.fields: ['doctorId']`) |
| PATCH | `/api/patients/:id` | any subset of fields (≥ 1); `doctorId` reassigns; `email`/`notes` = `""` or `null` clears | `{ data: Patient }` | 400, 404 `NOT_FOUND` (patient), 404 `DOCTOR_NOT_FOUND` |
| DELETE | `/api/patients/:id` | — | 204 | 400, 404 |
| GET | `/api/doctors/:id/patients` | same query as `/api/patients`; a `doctorId` query value is ignored | `{ data: Patient[], meta }` | 400, 404 `NOT_FOUND` (doctor) |
| POST | `/api/doctors/:id/patients` | Patient fields; a body `doctorId` is ignored | 201 `{ data: Patient }` | 400, 404 `NOT_FOUND` (doctor) |

`Patient` = `{ id, name, age, gender, phone, email, condition, status, admissionDate, notes, doctorId, doctor: { id, name, specialization } | null, createdAt, updatedAt }`. `email` and `notes` are always present (`null` when empty). `doctor` is `null` only if the doctor no longer exists, which the doctor delete guard prevents.

`sort` values: `-admissionDate` (default), `admissionDate`, `name`, `-name`, `-createdAt`.

**404 codes:** a missing doctor referenced **in the body** is `DOCTOR_NOT_FOUND` with `details.fields: ['doctorId']`, so the form can show it on the doctor select. A missing doctor **in the URL** (nested routes) is the generic `NOT_FOUND`, like any missing path resource.

## Query strategy
- **List:** `find(filter).select(fields).sort(sort).skip().limit().lean()` and `countDocuments(filter)` in parallel, then the page's doctors in **one** `DoctorModel.find({ _id: { $in: ids } })`. That's 3 queries whatever the page size.
- **A doctor's list** (`/api/doctors/:id/patients`): the doctor lookup (needed for the 404 and for the `doctor` field) runs **in parallel** with find + count, so all 3 queries run at once.
- **Filter + default sort** uses an ESR index exactly: `doctorId` / `condition` / `status` equality, then `admissionDate`, then `_id`.
- **Create:** load the doctor (404 if missing) → `create()`. The loaded doctor fills the response's `doctor` field, so no extra read.
- **Update:** the patient load and (on reassignment) the new doctor's lookup run in parallel. Then `set` + `save()` so validation and the `searchKey` hook run. Clearing `email` re-derives `searchKey` without the email token.
- **Delete:** `deleteOne` + `deletedCount` (no document is read back).

## Implementation notes / changes from plan
- **`$in` lookup by hand instead of `populate`.** Same queries (`populate` also issues a single `$in`), but the result is typed, `doctorId` survives even if a doctor were missing (populate would null it), and create/update reuse the doctor they already loaded for validation.
- **`clearableField()`** in `lib/schemas.ts`: optional body fields treat `""`, whitespace and `null` as "no value". On update the key stays in the parsed body as `undefined`, and `doc.set()` turns it into `$unset` (covered by a test that reads the raw document).
- **Index `{ name: 1, _id: 1 }` added** to the patient model for the name sorts (the patients table will sort by name).
- **Nested routes** are declared in `doctors.routes.ts` (the URL belongs to the doctor) but their handlers live in `patients.controller.ts` (the response is patients).
- `explain-queries.ts` covers 7 patient queries and picks a doctor that has patients, so per-doctor plans show real key counts.
