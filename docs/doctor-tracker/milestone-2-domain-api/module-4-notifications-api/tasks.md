# Module 2.4 — Notifications API: Tasks

> Added 2026-11-15 at the user's request (topbar notification bell).

- [x] [backend] `NOTIFICATION_TYPES` + `NOTIFICATION_SUBJECT_KINDS` in `constants/enums.ts`
- [x] [backend] `notification.model.ts`: type, title, message, subject `{ kind, id, name }`, `readAt` (shared inbox), `createdAt`; indexes for newest-first list, unread count, subject cleanup; 30-day TTL
- [x] [backend] `notifications.service.ts`: `notificationCopy` (all titles / messages), `withTitle()`, `notify()` + `removeNotificationsFor()` (log, never throw), list + unread count in parallel, idempotent mark-read, mark-all-read
- [x] [backend] `GET /api/notifications?limit=`, `PATCH /api/notifications/:id/read`, `POST /api/notifications/read-all` (admin only)
- [x] [backend] Events: doctor created, doctor active → on leave / inactive (with patients still assigned), patient created (both routes), patient recovered, patient reassigned; cleanup on doctor / patient delete
- [x] [backend] Seed: 30 notifications over the last 7 days from the seeded data, newest 12 unread; `db:sync` copies `notifications`
- [x] [backend] `explain-queries.ts`: list, unread count, subject cleanup + TTL index check
- [x] [test] `tests/notifications.test.ts` (16): auth, list shape / order / unread count, limit validation, empty inbox, mark-read (idempotent, 404, 400), read-all, all five events through the real endpoints, edits that must not notify, delete cleanup, failure isolation
- [x] [test] Full suite, typecheck, `db:explain`, reseed local DB, `db:sync` to Atlas, read-only check through the running API
