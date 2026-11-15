# Doctor Tracker — frontend

Next.js 16 (App Router) admin portal. Talks to the Express API in `../backend` over REST.

```bash
cp .env.example .env.local   # optional: BACKEND_URL defaults to http://localhost:8082
npm install
npm run dev                  # http://localhost:3000 (start the backend first)
```

| Script | |
|---|---|
| `npm run dev` | dev server (Turbopack) |
| `npm run build` / `npm start` | production build / serve |
| `npm run typecheck` | generate route types, then `tsc --noEmit` |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript rules) |
