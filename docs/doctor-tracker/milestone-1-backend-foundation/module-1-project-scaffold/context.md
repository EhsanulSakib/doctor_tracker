# Module 1.1 — Project Scaffold: Context

## Scope
Repo skeleton + backend skeleton with all cross-cutting concerns (env, logging, errors, validation, security middleware, DB). No domain logic.

## Contracts
`GET /api/health` (public, not rate-limited)
```json
200 { "status": "ok", "db": "up", "uptime": 12 }
503 { "status": "degraded", "db": "down", "uptime": 12 }
```

Error shape (all errors, all modules):
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Some fields are invalid", "details": [{ "path": "email", "message": "Invalid email address" }] } }
```
Codes introduced here: `VALIDATION_ERROR` (400), `BAD_JSON` (400), `INVALID_ID` (400), `PAYLOAD_TOO_LARGE` (413), `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL` (500).

## Rate limits
- Global: 600 requests / 15 min per IP on `/api/*` (except `/api/health`).
- `loginLimiter` (10 / 15 min, successful logins not counted) and `refreshLimiter` (60 / 15 min) are defined here and wired up in 1.2.
- All limiters are skipped when `NODE_ENV=test`.

## Changes from the original plan (implementation decisions)
1. **Validation via `handler()` wrapper instead of a `req.valid` middleware.** `handler({ body, query, params }, async ({ body, query, params }, req, res) => …)` gives fully typed parsed input with no casts or global type augmentation.
2. **No global `mongoose.set('sanitizeFilter', true)`.** It wraps *any* `$`-prefixed object in `$eq`, including the service's own `$regex` / `$in` / `$gte` filters, so every query would need `mongoose.trusted()`. Operator injection is blocked instead by:
   - Express 5's `simple` query parser (no nested objects from `?a[$ne]=x`),
   - Zod schemas on every input (strings / numbers / enums only),
   - Zod stripping unknown body keys.
3. **`ACCESS_TOKEN_TTL_SECONDS` (number) instead of `ACCESS_TOKEN_TTL` (string).** It's used for both the JWT `exp` and the cookie `maxAge`, so a number avoids parsing.
4. **`TRUST_PROXY` env (hop count).** Behind Render / the Vercel rewrite, rate limiting needs the real client IP.
5. **TypeScript pinned to 5.9.3.** TS 7 (native compiler) is days old; 5.9 is what the rest of the tooling targets.

## Local test tip
The first test run downloads a MongoDB binary for mongodb-memory-server. To reuse an installed `mongod` instead:
`MONGOMS_SYSTEM_BINARY="C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" npm test`
