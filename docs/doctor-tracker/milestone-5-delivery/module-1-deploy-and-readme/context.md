# Module 5.1 — Deploy + README: Context

## README section map (spec template → content)
| Spec section | Content |
|---|---|
| Description | One-paragraph pitch: secure admin portal for doctors and their patients, with fast search/filtering and an analytics dashboard |
| Setup Guide | Prerequisites, clone, `docker compose up -d` (or Atlas URI), `backend/.env` from `.env.example`, `npm i && npm run seed && npm run dev`, then the same for `frontend/` |
| System Architecture | Mermaid diagram: Browser → Next.js (proxy.ts, Server Components, /api rewrite) → Express (middleware chain → modules) → MongoDB; plus the auth sequence |
| Technical Decisions | (1) httpOnly cookie refresh-token rotation behind a same-origin proxy vs localStorage tokens; (2) Server Components for data + Redux for UI state vs client-side data fetching |
| Visual Evidence | Desktop + mobile screenshots from `docs/screenshots/` |

## Extra sections (help the evaluation criteria)
Indexing & query strategy (with `explain()` results) · Security checklist · Scalability notes (Redis for cache/rate limits, read replicas, cursor pagination for very deep pages) · API reference table · Testing.

## What I need from you at this module
- Vercel, Render and MongoDB Atlas accounts (or permission to leave the app deployment-ready with step-by-step instructions)
- The production URLs once deployed, to finish the README links
