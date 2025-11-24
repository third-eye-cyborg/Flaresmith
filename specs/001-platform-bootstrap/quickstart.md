# Quickstart: Flaresmith Platform Bootstrap (formerly CloudMake)

## Prerequisites
- Node.js 20.x
- pnpm >= 8
- GitHub account (for App + Codespaces)
- Cloudflare account + API token
- Neon account + API key
- Postman account + API key

## Clone & Install
```bash
git clone <repo-url> flaresmith
cd flaresmith
pnpm install
```

## Workspace Layout
```
apps/ (web, mobile, api)
packages/ (ui, types, api-client, utils, config)
mcp/ (config.json + servers/ tool descriptors)
specs/ (feature specs)
```

## Development (Codespaces Recommended)
```bash
pnpm dev
```
Runs concurrently:
- apps/web (Next.js)
- apps/api (Hono on Cloudflare Workers via wrangler dev)
- apps/mobile (Expo)

## Environment Variables
Create `.env.development` (or Codespaces secrets) with placeholders:
```
GITHUB_APP_ID=__REPLACE__
GITHUB_APP_PRIVATE_KEY=__REPLACE__
CLOUDFLARE_API_TOKEN=__REPLACE__
NEON_API_KEY=__REPLACE__
POSTMAN_API_KEY=__REPLACE__
BETTERAUTH_SECRET=__REPLACE__
ONE_SIGNAL_KEY=__REPLACE__
POSTHOG_KEY=__REPLACE__
```

## Provision First Project (Local Script Flow)
```bash
pnpm exec ts-node scripts/provision/createProject.ts --name "demo" --org default --integrations github,cloudflare,neon,postman
```
Returns project JSON with environment matrix.

## Apply Spec Changes
Edit feature spec under `specs/001-platform-bootstrap/spec.md`. Then:
```bash
pnpm exec ts-node scripts/spec/apply.ts --project <projectId>
```
Generates/updates (idempotent):
- Zod schemas (packages/types/src/api/*)
- Drizzle models (apps/api/db/schema/*)
- Hono route stubs (apps/api/src/routes/*)
- Postman collections (base + env-specific)
- MCP tool descriptors (`mcp/servers/*/*.json`)
- OpenAPI contract fragments (specs/001-platform-bootstrap/contracts/openapi.yaml)

Produces drift report with:
```jsonc
{
	"changedFiles": [ { "path": "...", "changeType": "modified" } ],
	"summary": { "totalFiles": 12, "filesCreated": 2, "filesModified": 10, "filesDeleted": 0, "hasConflicts": false },
	"appliedAt": "2025-11-21T10:15:30Z"
}
```

## Run Tests
```bash
pnpm test          # Vitest unit + integration
pnpm postman:test  # Postman CLI collection run
pnpm typecheck     # TypeScript project-wide
pnpm lint          # ESLint
```

## Promotion
Merge feature branch → staging via PR; GitHub Action runs: lint → typecheck → tests → postman → deploy staging. Then approve staging → main promotion.

## Chat & Editor
Open apps/web, navigate to /project/<id>/editor. Start chat session (backend spawns Copilot CLI wrapper). Apply diffs → commit feature branch.

## Deployment Targets
- Dev: Codespaces + wrangler dev (Workers) and Next.js
- Prod: Cloudflare Workers (Hono) + Neon serverless

## Observability
Structured logs with correlationId. Environment dashboard surfaces latest deployment/build plus:
- Rate limit remaining tokens (`meta.rateLimit.userRemaining` / `projectRemaining`)
- Circuit breaker states (`meta.circuitBreakers[]`) for external services

## Rollback
Initiate via UI: selects previous successful Deployment → creates rollback Deployment referencing commitSha.

## MCP Tool Refresh
After adding integrations or applying spec changes:
```bash
pnpm exec ts-node scripts/mcp/syncTools.ts --project <projectId>
```
Validates descriptor schema refs; regenerates missing tools; skips unchanged artifacts.

## Security Notes
- No secrets committed
- Pre-commit hook (future) scans for token patterns
- All provisioning actions logged with actor + correlationId

## Next Steps
1. Run initial project provisioning script
2. Apply spec to generate artifacts
3. Validate drift report summary
4. Inspect OpenAPI contract additions
5. Run Postman test collection (`pnpm postman:test`)
6. Review rate limit headers on API responses (X-RateLimit-*)
7. Observe circuit breaker headers (X-CircuitBreaker-*) under failure simulation
