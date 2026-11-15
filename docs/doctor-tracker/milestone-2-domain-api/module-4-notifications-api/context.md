# Module 2.4 — Notifications API: Context

> Added on 2026-11-15 at the user's request: the topbar gets a notification bell with an unread count ("9+" above nine). This module gives the bell real data; it was not in the original plan.

## Model: `Notification` (collection `notifications`)
| Field | Type | Notes |
|---|---|---|
| `type` | `patient_admitted` · `patient_recovered` · `patient_reassigned` · `doctor_added` · `doctor_unavailable` | `NOTIFICATION_TYPES` in `constants/enums.ts` |
| `title`, `message` | string | written once, when the event happens (a later rename doesn't rewrite history) |
| `subject` | `{ kind: 'doctor' \| 'patient', id: ObjectId, name }` | what the notification is about; the frontend links doctors to `/doctors/:id` and patients to the patient list |
| `readAt` | `Date \| null` (default `null`) | **one shared team inbox**: read by any admin = read for everyone (no per-user state) |
| `createdAt` | Date | `timestamps: { createdAt: true, updatedAt: false }` |

### Indexes
| Index | Serves |
|---|---|
| `{ createdAt: -1, _id: -1 }` | newest-first list (stable order for equal timestamps) |
| `{ readAt: 1, createdAt: -1 }` | unread count and "mark all as read" (`readAt: null` = unread) → `COUNT_SCAN`, 0 documents read |
| `{ 'subject.id': 1 }` | cleanup when a doctor or patient is deleted |
| `{ createdAt: 1 }`, `expireAfterSeconds: 2592000` | **TTL: notifications are deleted after 30 days** by MongoDB's TTL monitor (about once a minute). A TTL index must be single-field, so it can't double as the list index |

## Endpoints (admin only, like doctors / patients)
| Method | Path | Response |
|---|---|---|
| GET | `/api/notifications?limit=20` | `{ data: NotificationDto[], meta: { unreadCount } }`, newest first. `limit` int 1–50, default 20; anything else → 400 `VALIDATION_ERROR`. `unreadCount` counts the whole inbox, not just the page |
| PATCH | `/api/notifications/:id/read` | `{ data: NotificationDto }`; idempotent (keeps the first `readAt`); 400 invalid id; 404 `NOT_FOUND` |
| POST | `/api/notifications/read-all` | `{ data: { updated } }` (how many were unread) |

```json
{
  "data": [
    {
      "id": "6af948c7b2aa0cae1eb8d593",
      "type": "patient_recovered",
      "title": "Sanjida Karim has recovered",
      "message": "Patient of Dr. Jannatul Uddin",
      "subject": { "kind": "patient", "id": "6af948c7b2aa0cae1eb8d576", "name": "Sanjida Karim" },
      "read": false,
      "createdAt": "2026-11-15T05:49:54.010Z"
    }
  ],
  "meta": { "unreadCount": 12 }
}
```

## Events (created by the doctor / patient services)
| Trigger | Type | Title / message |
|---|---|---|
| doctor created | `doctor_added` | "New doctor: Dr. {name}" / "{specialization} · {hospital}" |
| doctor status `active` → `on_leave` / `inactive` | `doctor_unavailable` | "Dr. {name} is on leave" or "… is inactive" / "{n} patients still assigned" · "1 patient still assigned" · "No patients assigned" (patients not yet recovered) |
| patient created (`POST /api/patients` or `POST /api/doctors/:id/patients`) | `patient_admitted` | "New patient: {name}" / "Assigned to Dr. {doctor} ({specialization})" |
| patient status → `recovered` | `patient_recovered` | "{name} has recovered" / "Patient of Dr. {doctor}" |
| patient `doctorId` changed | `patient_reassigned` | "{name} moved to Dr. {new}" / "Previously with Dr. {old}" |

- Both recovered and reassigned in one edit → both notifications. Saving an already-recovered patient, "reassigning" to the same doctor, other doctor edits, and `on_leave` → `inactive` create nothing.
- Doctor names are stored with the title ("Dr. Nusrat Jahan"); `withTitle()` adds "Dr." only when a name lacks it.
- All copy lives in `notificationCopy` (`notifications.service.ts`), shared by the services and the seed.
- **Failure isolation:** notifications are written after the main write succeeds, by `notify()`, which catches and logs errors. A failed notification never fails or rolls back the doctor / patient request (tested).
- **Cleanup:** deleting a doctor or patient deletes the notifications whose `subject.id` is that record.

## Seed
`npm run seed` rebuilds 30 notifications from the seeded doctors and patients, spread over the last 7 days in Dhaka clinic hours, never in the future, with the same fixed faker seed:
- this week's admissions (on their admission day);
- every on-leave / inactive doctor with their real count of patients still under care;
- 3 doctors "added" at 09:00–09:45 at the start of the week, so later events that mention them come after they were added;
- 5 reassignments of patients still under care to active doctors (from a colleague in the same field when possible);
- recoveries fill the rest.

The newest 12 are unread (the bell shows "9+"); older ones have a `readAt` 10–240 minutes after they arrived. Users and refresh tokens are untouched. `db:sync` copies `notifications` too.

## Implementation notes / changes from the brief
- **Doctor names already contain "Dr."** in the seed and the tests, so the copy uses `withTitle()` instead of always prefixing.
- Fallback copy for a doctor that no longer exists ("Doctor no longer listed" / "Previous doctor no longer listed"); the delete guard makes this practically unreachable.
- The backend has no ESLint setup (no `lint` script); `tsc --noEmit` is the static check.
