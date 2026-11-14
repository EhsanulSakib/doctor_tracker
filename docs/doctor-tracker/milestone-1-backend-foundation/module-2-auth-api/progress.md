# Module 1.2 — Auth API: Progress

**Status:** done
**Last updated:** 2026-11-14
**Blockers:** none

## Verification
- `tsc --noEmit`: passes
- `vitest run`: 22/22 passing (6 foundation + 16 auth)
- Manual against MongoDB Atlas on port 8082 (see QA guide § 1.2): admin seeded; 401 without cookie; wrong password 401; login 200 with httpOnly/Lax cookies; `me` 200; refresh rotates the token; logout 204 + cookies cleared; logged-out token → `SESSION_REVOKED`; operator injection → 400; brute force → 429 after 10 failures (correct password also blocked while limited)
- Latency: login ≈ 0.52 s steady state (bcrypt cost 12 ≈ 0.32 s + 2 Atlas round trips); health ≈ 2 ms
