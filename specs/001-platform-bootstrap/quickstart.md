# Quickstart: CloudMake Platform Bootstrap

## Prerequisites
- Node.js 20.x
- pnpm >= 8
- GitHub account (for App + Codespaces)
- Cloudflare account + API token
- Neon account + API key
- Postman account + API key

## Clone & Install
```bash
git clone <repo-url> cloudmake
cd cloudmake
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
Edit spec files under `specs/001-platform-bootstrap/`. Then:
```bash
pnpm exec ts-node scripts/spec/apply.ts --project <projectId>
```
Generates/updates:
- Zod schemas (packages/types)
- Drizzle models (apps/api/db/schema.ts)
- Postman collections (base + env-specific; export + API sync)
- MCP tool descriptors (`mcp/servers/*/*.json`)

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
Structured logs with correlationId; environment dashboard surfaces latest deployment and build status.

## Rollback
Initiate via UI: selects previous successful Deployment → creates rollback Deployment referencing commitSha.

## MCP Tool Refresh
Whenever integrations added or spec apply runs:
```bash
pnpm exec ts-node scripts/mcp/syncTools.ts --project <projectId>
```

## Security Notes
- No secrets committed
- Pre-commit hook (future) scans for token patterns
- All provisioning actions logged with actor + correlationId

## Next Steps
1. Implement code generation scripts under `scripts/`
2. Add CI workflows in `.github/workflows/`
3. Flesh out Workers deployment and bindings
4. Expand test coverage (Playwright + Postman)
