# Milestone 5 — Delivery: Context

## Goal
Deployment-ready configuration, a README that meets the spec template, screenshots, and a final end-to-end verification.

## Relevant decisions
#13 deploy · #14 testing · README template from the spec (Description, Setup Guide + `.env.example`, System Architecture, 2 Technical Decisions, Visual Evidence)

## Production topology
```
Browser ──► Vercel (Next.js)
              ├─ pages: Server Components ──► Render (Express) ──► MongoDB Atlas
              └─ /api/* rewrite ───────────► Render (Express)
```
- Cookies are set on the Vercel domain (first-party) because `/api/*` is proxied.
- Render: `NODE_ENV=production`, `trust proxy`, `Secure` cookies, `FRONTEND_URL` = Vercel URL for CORS.
- Atlas: free M0 cluster; network access must allow Render's egress (or 0.0.0.0/0 for the demo, documented as a trade-off).
- Render free tier sleeps after inactivity; the first request can take ~30 s (noted in the README).
