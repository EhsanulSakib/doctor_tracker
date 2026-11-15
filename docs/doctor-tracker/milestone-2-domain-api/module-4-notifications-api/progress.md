# Module 2.4 — Notifications API: Progress

**Status:** done (awaiting review)
**Last updated:** 2026-11-15
**Blockers:** none

## Verification
- `tsc --noEmit` clean (the backend has no ESLint setup)
- `vitest run`: 98/98 (82 before + 16 notifications)
- `npm run seed` on the local DB: 30 notifications (12 unread), 9 Nov 09:11 → 15 Nov 11:49 Dhaka time; mix: 15 recovered, 5 reassigned, 4 doctor unavailable, 3 admitted, 3 doctors added; timeline checked (no event mentions a doctor before they were added)
- `npm run db:explain`: 25 queries, all indexed. Notifications: list `IXSCAN(createdAt_-1__id_-1)` 20 keys / 20 docs; unread count `COUNT_SCAN(readAt_1_createdAt_-1)` 12 keys / 0 docs; cleanup `IXSCAN(subject.id_1)`; TTL index present (30 days)
- Read-only check through the running API on :8082 (the user's `tsx watch` dev server reloaded the new route): `GET /api/notifications?limit=50` → 200, 30 items, `unreadCount: 12`; `limit=0` → 400 `VALIDATION_ERROR`
- `npm run db:sync -- --yes`: Atlas now has users 1 · doctors 15 · patients 200 · notifications 30, with the same indexes (TTL included)

## Database state (2026-11-15)
| | users | doctors | patients | notifications |
|---|---|---|---|---|
| local `127.0.0.1/doctor_tracker` | 1 | 15 | 200 | 30 (12 unread) |
| Atlas `doctor_tracker` | 1 | 15 | 200 | 30 (synced) |
