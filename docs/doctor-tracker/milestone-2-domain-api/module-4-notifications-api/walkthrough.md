# Module 2.4 — Notifications API: Walkthrough

> A guide to every file this module created or changed, the ideas behind it, and how it was verified.
> Status: **done** (2026-11-15) · 16 new automated tests (98 total) · every notification query uses an index · local and Atlas identical.
> Added at the user's request for the topbar notification bell; not part of the original plan.

## What this module built
- **A notifications inbox** fed by real domain events: new doctor, doctor on leave / inactive, new patient, patient recovered, patient moved to another doctor.
- **Three endpoints** for the bell: list with unread count, mark one as read, mark all as read.
- **Seeded notifications** that match the seeded doctors and patients, so the bell has believable data right after `npm run seed`.

## Files

### Created
```
backend/src/modules/notifications/
├── notification.model.ts          schema, 3 query indexes + 30-day TTL
├── notifications.service.ts       copy builders, notify() / cleanup, list / mark read / mark all
├── notifications.schema.ts        limit validation (1–50, default 20)
├── notifications.controller.ts    HTTP layer
└── notifications.routes.ts        /api/notifications (admin only)
backend/tests/notifications.test.ts  16 tests
```

### Changed
| File | Change | Why |
|---|---|---|
| `src/constants/enums.ts` | `NOTIFICATION_TYPES`, `NOTIFICATION_SUBJECT_KINDS` | one list for model, types and frontend mirror |
| `src/routes.ts` | mounts `notificationsRouter` at `/api/notifications` | |
| `src/modules/doctors/doctors.service.ts` | `doctor_added` on create; `doctor_unavailable` when status leaves `active` (counts patients not yet recovered, in parallel with the patient count); cleanup on delete | events |
| `src/modules/patients/patients.service.ts` | `patient_admitted` in `insertPatient` (both create routes); `patient_recovered` / `patient_reassigned` from what actually changed in an update; cleanup on delete | events |
| `src/scripts/seed.ts` | builds 30 notifications from the seeded data (newest 12 unread); clears and re-creates them | believable bell data |
| `src/scripts/db-sync.ts` | copies `notifications` | Atlas stays identical |
| `src/scripts/explain-queries.ts` | 3 notification queries + TTL index check | verify index use |

## How an event becomes a notification
```
PATCH /api/patients/:id { status: 'recovered', doctorId: B }
  │
  └─ patients.service.updatePatient
        load patient + new doctor (parallel) → remember previous { status, doctorId }
        patient.set(input) → save()                         ← the real write; errors here fail the request
        clearDashboardCache()
        compare before / after:
          status became 'recovered'   → notificationCopy.patientRecovered(...)
          doctorId changed            → notificationCopy.patientReassigned(..., old doctor)
        notify(...events)                                  ← insertMany in try/catch: logs, never throws
        respond 200 with the patient
```

## Key concepts in this module

### 1. Side effects that can't break the main action
The doctor or patient is saved first; the notification is a follow-up. `notify()` wraps the insert in try/catch and logs the error, so a notification problem (disk full, validation bug) can never turn a successful save into a 500, and never rolls it back. A test mocks `insertMany` / `deleteMany` to fail and checks every doctor / patient request still succeeds.

### 2. Notify on change, not on save
The services remember the previous status / doctor before `set()`, then compare. Saving a patient who was already recovered, "moving" a patient to the doctor they already have, or editing a doctor's hospital creates nothing. Only `active` → `on_leave` / `inactive` counts as a doctor becoming unavailable: that's the moment their patients may need another doctor, so the message carries the number of patients not yet recovered.

### 3. One place for the copy
`notificationCopy` builds every title and message. The services and the seed both call it, so seeded notifications read exactly like live ones. Doctor names are stored with "Dr."; `withTitle()` adds it only when missing.

### 4. A shared inbox and its indexes
There is one admin role, so read state is a single `readAt` on the notification (read by anyone = read for everyone), not a per-user list. That keeps the unread count a pure index operation: `{ readAt: 1, createdAt: -1 }` turns `countDocuments({ readAt: null })` into a `COUNT_SCAN` that reads 0 documents, and the same index finds the rows "mark all as read" updates.

### 5. TTL: old notifications clean themselves up
`{ createdAt: 1 }` with `expireAfterSeconds` makes MongoDB delete notifications 30 days after they were created (its TTL monitor runs about once a minute). TTL indexes must be single-field, so the list uses its own `{ createdAt: -1, _id: -1 }` index for a stable newest-first order.

### 6. Idempotent "mark as read"
`findOneAndUpdate({ _id, readAt: null }, { $set: { readAt: now } })` only matches an unread notification; if it's already read, the service just loads it. Clicking twice (or two admins at once) keeps the first read time and still answers 200.

### 7. Seed data with a consistent timeline
Notification times fall in Dhaka clinic hours over the last 7 days and never after "now". Doctors "added" this week get the earliest slot, so no event mentions a doctor before they were added; reassignments only move patients to active doctors.

## Tests (`tests/notifications.test.ts`, 16)
- 401 on all three routes without a session
- List: newest first, default limit 20, whole-inbox `unreadCount`, exact item shape; `limit` 3 / 50 honoured; `0`, `51`, `abc`, `2.5` → 400; empty inbox
- Mark read: 200, idempotent (same `readAt`), 404 unknown id, 400 invalid id; read-all returns the count and is 0 the second time
- Events through the real endpoints: new doctor (with and without "Dr." in the name), on leave / inactive with "3 patients still assigned" / "1 patient still assigned" / "No patients assigned", on_leave → inactive ignored, irrelevant doctor edits ignored, new patient from both create routes, recovered, already-recovered save ignored, reassigned, recovered + reassigned in one edit, same-doctor "reassignment" ignored
- Delete cleanup for patient and doctor; failure isolation with mocked model errors

## Verification
- `tsc --noEmit` clean; `vitest run` 98/98.
- `npm run seed`: 30 notifications, 12 unread, 9 → 15 Nov in Dhaka clinic hours.
- `npm run db:explain`:
```
✓ notifications: latest 20 (topbar bell)                LIMIT ← FETCH ← IXSCAN(createdAt_-1__id_-1)   keys 20 · docs 20
✓ notifications: unread count / mark all read           GROUP ← COUNT_SCAN(readAt_1_createdAt_-1)     keys 12 · docs 0
✓ notifications: cleanup for a deleted subject          FETCH ← IXSCAN(subject.id_1)                  keys 1  · docs 1
✓ TTL  notifications.createdAt_1: removed after 30 days
```
- Running API (:8082): `GET /api/notifications?limit=50` → 30 items, `unreadCount: 12`.
- `db:sync -- --yes` → Atlas: notifications 30 with the same indexes.

## Problems found and fixed during this module
| Problem | Fix |
|---|---|
| Brief assumed names without "Dr.", but the seed stores "Dr. …" | `withTitle()` adds the title only when it's missing |
| Seed crashed: spreading a Mongoose document (`{ ...doctor }`) copies no fields | pass the fields explicitly |
| First seed run: "New doctor" events dated after events that already mentioned those doctors, and today's events bunched just before the seed ran | added doctors get the first morning slot of the week; today's events spread from opening time to now |

## Checkpoint summary
- Notifications API complete: five event types from real doctor / patient changes, shared inbox, idempotent read, 30-day TTL, failure-isolated writes.
- 98/98 tests; every notification query uses an index (unread count reads 0 documents).
- Local and Atlas identical (users 1, doctors 15, patients 200, notifications 30).
- Next: the topbar bell in the frontend uses this contract (see the FE guide).
