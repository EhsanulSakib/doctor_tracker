# Module 5.1 — Deploy + README: Progress

**Status:** done (awaiting review); deployment is done by the user
**Last updated:** 2026-11-15
**Blockers:** none. After deploying, add the live URL at the top of `README.md` (the "Live demo" row) and share the demo credentials with the submission.

## Verification
- Every README fact checked against the code or a command:
  - env vars match `backend/src/config/env.ts` and both `.env.example` files;
  - the scripts match both `package.json` files;
  - the index tables match the models;
  - the query-plan table comes from `npm run db:explain` (25/25 indexed);
  - cookie flags, rate limits, role checks, token hashing (SHA-256) and the reuse grace window (10 s) were read from the source.
- All 18 image links resolve to files in `docs/screenshots/`. Each screenshot was looked at, and three were retaken: the navigation drawer had a sheet behind it, and the two top-bar panels are now cropped to the panel's measured box.
- Mermaid diagrams were written in conservative syntax (no `<` in messages, plain attribute types). Automatic rendering through Mermaid could not be run here (it needs a CDN). Check them once on GitHub after pushing.
