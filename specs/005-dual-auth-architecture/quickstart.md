# Quickstart: Dual Auth & Multi-MCP Setup

## Prerequisites
- Node 20.x + pnpm
- Cloudflare account (Workers + Pages + Images + Stream tokens)
- Neon project (dev/staging/prod branches)
- Polar account + API key (standard user billing only)
- Better Auth + Neon Auth configured provider secrets
- OneSignal, PostHog, Mapbox, GitHub PAT/App, Postman API key

## 1. Install Dependencies
Run: `pnpm install` (repo root) – ensures shared packages ready.

## 2. Environment Variables (Example .env.dev)
```
NEON_DATABASE_URL=postgres://...
POLAR_API_KEY=sk_live_...
BETTER_AUTH_SECRET=...
NEON_AUTH_SECRET=...
CLOUDFLARE_API_TOKEN=...
ONESIGNAL_API_KEY=...
POSTHOG_API_KEY=...
MAPBOX_PUBLIC_TOKEN=pk.XXX...
GITHUB_TOKEN=ghp_...
POSTMAN_API_KEY=pm_...
APP_TYPE=user # or admin for admin surfaces
MCP_READ_ONLY=false # set true in staging/prod
PEPPER_ENV=<random-32-byte>
```
Staging/Prod: set `MCP_READ_ONLY=true`.

## 3. Run Dev Mode
```
pnpm dev
```
Starts Workers API (Hono), Next.js, Expo bundler.

## 4. Authentication Flows
- Admin: Neon Auth login at `/admin/login` (web) or admin mobile route; MFA TOTP required.
- User: Better Auth login at `/login`; OAuth providers configured.
Token claims include `type:admin` or `type:user`; middleware enforces isolation.

## 5. Billing (User Only)
- Web: POST `/billing/web/checkout` → redirect to Polar checkout.
- Mobile: Purchase triggers POST `/billing/mobile/receipt` with `receiptToken`.
Webhook: Polar events hit `/billing/webhook/polar` updating subscription status.

## 6. Mapbox Token Management
POST `/mapbox/tokens` with full token; stored salted+peppered hash; returned partial prefix/suffix.
List tokens via GET `/mapbox/tokens`.

## 7. Notifications
Admin creates segment (`POST /notifications/segments`) then dispatches (`POST /notifications/dispatch`). Users adjust preferences via future endpoint (spec extension).

## 8. MCP Servers
Configured in `mcp/servers/`:
- polar, better-auth, neon, cloudflare, github, postman, mapbox, onesignal, posthog, framework.
Run drift sync: `pnpm exec cloudmake sync-mcp` (future CLI alias).

## 9. Rate Limiting
Per-server quotas (60/min, burst 120). 429 responses include `Retry-After`.
Check status via tool `system.rateLimitStatus`.

## 10. Observability
- MCP invocations logged to `mcp_tool_invocations`.
- Admin actions to `admin_audit_logs`.
- Nightly load test updates `mcp_server_metrics`.
- Drift snapshots stored in `mcp_drift_snapshots`.

## 11. Read-Only Enforcement
Set `MCP_READ_ONLY=true` in staging/prod to restrict Neon writes, Cloudflare destructive tools, GitHub mutations, Postman contract test runs (read-only validation only).

## 12. Security Checklist
- No raw secrets logged (redaction middleware).
- Mapbox tokens hashed with salt+pepper.
- Playback tokens 5m TTL + denylist revocation.
- Receipt validation server-side only.

## 13. Promotion Flow
Dev → Staging → Prod: deploy Workers + Pages, branch promotion Neon, ensure MCP read-only toggled; run Postman contract tests in staging then gating production.

## 14. Graceful Degradation
If MCP server outage >60s: system surfaces fallback guidance (SDK direct usage) + logs outage event.

## 15. Next Steps
Implement Drizzle schemas per data-model.md; add Zod schemas to `packages/types`; integrate middleware for token type isolation; scaffold MCP server descriptors.

---
Ready for Constitution re-check and task breakdown.
