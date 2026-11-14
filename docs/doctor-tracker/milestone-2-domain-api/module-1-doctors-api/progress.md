# Module 2.1 — Doctors API: Progress

**Status:** done
**Last updated:** 2026-11-14
**Blockers:** none

## Verification
- `tsc --noEmit` clean · `tsc -p tsconfig.build.json` clean
- `vitest run`: 44/44 (6 foundation + 16 auth + 22 doctors)
- Manual against Atlas (QA guide § 2.1): 15 checks passed: 401 without session, create, duplicate email 409, validation messages, default list, search by surname / phone / multi-word, 5 filters, pagination, limit > 50 rejected, hospitals, options, get / 404 / 400, update + search sync, delete guard 409 → 204 → 404
- `npm run db:explain`: all 8 queries use an index (no COLLSCAN). On 2 documents the search query walks the `createdAt` index; `searchKey_1` is in the rejected plans. Re-check on seeded data in 2.3.

## Environment note
The C: drive has ~0.3 GB free, so mongodb-memory-server crashed writing to `%TEMP%`. Tests are run with `TEMP`/`TMP` pointed at `backend/.tmp` on D: (git-ignored).
