# Module 2.2 — Patients API: Progress

**Status:** done (awaiting review)
**Last updated:** 2026-11-15
**Blockers:** none

## Verification
- `tsc --noEmit` clean · `tsc -p tsconfig.build.json` clean
- `vitest run`: 70/70 (6 foundation + 16 auth + 22 doctors + 26 patients)
- Manual curl (QA guide § 2.2): 21 checks passed against a **local MongoDB 8.2** (throwaway `mongod` from the cached test binary)
- **Re-run on Atlas (2026-11-15, after `.env` was added):** all 21 checks passed against MongoDB Atlas 8.0.37, using the 2 demo doctors; every "QA …" test patient was deleted afterwards (Atlas back to 2 doctors / 0 patients)
- `npm run db:explain` on 402 patients / 14 doctors: all 15 queries use an index (no COLLSCAN). Equality + sort queries examine exactly as many keys as rows returned

## Environment notes
- C: now has ~2.75 GB free. Tests still run with `TEMP`/`TMP` on D: (`backend/.tmp`)
- **Vitest needs an uppercase drive letter on Windows.** From `d:\…` (lowercase, e.g. Git Bash `/d/...` or VS Code's default terminal), every suite fails with "Vitest failed to find the runner" because Vitest loads twice under two path spellings. Run from `D:\project\doctor_tracker\backend` (e.g. `Set-Location D:\project\doctor_tracker\backend` in PowerShell first)
