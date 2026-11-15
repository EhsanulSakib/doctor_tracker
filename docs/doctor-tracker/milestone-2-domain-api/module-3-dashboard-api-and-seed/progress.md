# Module 2.3 — Dashboard API + Seed: Progress

**Status:** done (awaiting review)
**Last updated:** 2026-11-15
**Blockers:** none

## Verification
- `tsc --noEmit` clean · `tsc -p tsconfig.build.json` clean
- `vitest run`: 78/78 (6 foundation + 16 auth + 22 doctors + 26 patients + 8 dashboard)
- `npm run seed` on the local DB: 15 doctors (11 active), 200 patients; a second run produces identical data (hash of all doctors + patients matched)
- Manual (QA guide § 2.3): stats for 30d / 90d / 12m on local and on Atlas; chart sums equal the new-patients KPI in every range; cached responses ~2 ms
- `npm run db:explain` on the seeded data, local and Atlas: 22 queries, all use an index; the 7 dashboard queries examine 0 documents
- `npm run db:sync -- --yes` pushed local → Atlas; users / doctors / patients are document-for-document identical on both (sha256 of every collection) with the same indexes

## Database state (2026-11-15)
| | users | doctors | patients |
|---|---|---|---|
| local `127.0.0.1/doctor_tracker` | 1 | 15 | 200 |
| Atlas `doctor_tracker` | 1 | 15 | 200 (identical) |

The 2 demo doctors from 2.1 are gone (replaced by the seed, as planned).
