# Doctor Tracker — Feature Spec (living document)

> Updated **only** when a module passes verification. Last updated: 2026-11-14 (planning complete, no modules verified yet).

## Overview
Doctor Tracker is a secure admin portal for managing doctors and the patients assigned to them, with an analytics dashboard.
- **frontend/** — Next.js 16 (App Router, TypeScript, Tailwind CSS 4, Framer Motion via `motion`, Redux Toolkit, Recharts)
- **backend/** — Express 5 + Mongoose 9 (TypeScript), REST API
- **Database** — MongoDB (local via docker-compose, Atlas in production)
- **Hosting** — Vercel (frontend) · Render (backend) · MongoDB Atlas

## Confirmed decisions (Phase 1)
| # | Area | Decision |
|---|---|---|
| 1 | Repo | `frontend/` (Next.js App Router, TS) + `backend/` (Express + Mongoose, TS), separate `package.json` + `.env.example`, no monorepo tooling |
| 2 | Auth | No signup, seeded admin, bcrypt. 15 min access JWT + rotating 7-day refresh token (stored hashed, reuse ⇒ revoke the session family), both httpOnly cookies. Next forwards `/api/*` → Express (same origin, `SameSite=Lax`). Next `proxy.ts` guards pages and refreshes expired access tokens; Express verifies JWT + `role: admin` on every route except login/refresh |
| 3 | Patient | name, age, gender, phone, email?, condition (fixed list), status (Active / Under treatment / Recovered), admissionDate, notes, `doctorId` (exactly one doctor, indexed). Editing a patient can reassign the doctor |
| 4 | Doctor | name, specialization (fixed list), hospital (free text, distinct-value filter), phone, email (unique), status (Active / On leave / Inactive), yearsOfExperience, joinedAt. Filters: specialization, hospital, status, joined range, experience range. List shows patient count |
| 5 | Deletes | Patient hard delete with confirm (both pages). Doctor edit + delete; delete blocked (409) while patients exist |
| 6 | Search | Lowercased indexed `searchKey` (name / email / phone), anchored prefix regex, 300 ms debounce |
| 7 | Pagination | Numbered pages 10/20/50, server cap 50, `find` + `countDocuments` in parallel, `.lean()` + projections, compound indexes, state in URL |
| 8 | Dashboard | KPIs with delta vs previous period, patients over time, top-10 patients per doctor, condition & status breakdowns, doctors by specialization; presets 30d / 90d / 12m; one endpoint, parallel aggregations, 60 s cache; Recharts |
| 9 | Data layer | Server Components fetch with Next `fetch` (cookies forwarded); URL is the source of truth for list queries; Redux Toolkit holds UI state (dialogs, current user, filter drafts, toasts); mutations via client fetch wrapper → `router.refresh()` |
| 10 | UI | No component library — all components custom; Tailwind CSS; Framer Motion; "Clinical ledger" (paper / ink / teal, IBM Plex Sans + tabular numerals, hairlines, collapsible sidebar, light/dark); responsive & accessible |
| 11 | API security | Zod on all inputs, helmet, CORS allowlist, rate limits, injection protection, body cap, central error handler `{ error: { code, message, details } }`, pino logging |
| 12 | Seed | 1 admin, ~15 doctors, ~200 patients over 12 months, faker with fixed seed |
| 13 | Deploy | Vercel + Render + Atlas; configs/docs + docker-compose for local MongoDB prepared; user deploys |
| 14 | Testing | Per-module curl + `explain()` verification; Vitest + Supertest for auth / validation / delete guard; frontend typecheck + lint + build + browser check |

## Completed modules
| Module | Verified | Summary |
|---|---|---|
| 1.1 Project scaffold | 2026-11-14 | Repo + Express 5 / TypeScript backend: validated env, pino logging, unified error shape, Zod `handler()` wrapper, helmet, CORS allowlist, 10kb body cap, rate limiting, Atlas connection, graceful shutdown, fail-fast on busy port. 6 automated tests + manual curl checks |

## Current API surface
Base URL (local): `http://localhost:8082`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | public | `200 { status: 'ok', db: 'up', uptime }` · `503` when the DB is down |

## Known issues
_None._
