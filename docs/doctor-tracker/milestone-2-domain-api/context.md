# Milestone 2 — Domain API: Context

## Goal
Doctors, patients and dashboard endpoints with optimized MongoDB queries, plus seed data, all verified with curl, Supertest and `explain()`.

## Relevant decisions
#3 patient model · #4 doctor model · #5 deletes · #6 search · #7 pagination · #8 dashboard · #12 seed

## Shared conventions
- Every route sits behind `requireAuth` + `requireRole('admin')`.
- List response shape:
  ```json
  { "data": [ ... ], "meta": { "page": 1, "limit": 10, "total": 248, "totalPages": 25 } }
  ```
- Single resource: `{ "data": { ... } }`. Create → 201, update → 200, delete → 204.
- `limit` ∈ {1..50} (default 10); `page` ≥ 1. Invalid values → 400.
- `sort` is whitelisted per resource (e.g. `-createdAt`, `name`, `-joinedAt`). Unknown values → 400.
- **Search:** `searchKey` is an array of lowercased tokens: each word of the name, plus the full email and the phone digits (multikey index). A query becomes `{ searchKey: { $regex: '^' + escapeRegex(term.toLowerCase()) } }`. Because the regex is anchored and case-sensitive, it uses the index, and matching per token means `okaf` finds "Dr. Lena Okafor" (surname prefix) as well as `lena`.
- **Pagination query:** `Promise.all([Model.find(filter).sort().skip().limit().select(projection).lean(), Model.countDocuments(filter)])`.
- **Dates:** ISO strings in, Date objects in Mongo, ISO strings out. Date-range filters are inclusive of the whole end day.

## Enums (shared constants, mirrored in frontend)
- `SPECIALIZATIONS`: Cardiology, Dermatology, Endocrinology, Gastroenterology, General Medicine, Neurology, Oncology, Orthopedics, Pediatrics, Psychiatry
- `DOCTOR_STATUSES`: active, on_leave, inactive
- `CONDITIONS`: Hypertension, Diabetes, Asthma, Arthritis, Migraine, Heart Disease, Respiratory Infection, Fracture, Skin Condition, Anxiety, Other
- `PATIENT_STATUSES`: active, under_treatment, recovered
- `GENDERS`: male, female, other

## Dependency note
The doctors API (2.1) needs the **Patient model** for patient counts and the delete guard, so the Patient schema + indexes are created in 2.1. Module 2.2 adds the patient endpoints on top of it.
