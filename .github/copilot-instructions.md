# CloudMake Development Guide for AI Agents

**Version**: 0.1.0 | **Last Updated**: 2025-11-21

## Project Architecture

CloudMake is a **spec-first orchestration platform** for multi-environment development workflows. The platform provisions and synchronizes GitHub repos, Cloudflare Workers/Pages, Neon Postgres branches, and Postman collections—all driven by declarative specifications.

### Monorepo Structure

```
apps/
├── api/          # Hono backend on Cloudflare Workers + Drizzle ORM
├── web/          # Next.js 14 dashboard (App Router)
└── mobile/       # Expo mobile app (NativeWind)

packages/
├── types/        # Zod schemas (single source of truth)
├── api-client/   # Typed API wrapper with Zod validation
├── ui/           # Shared React Native primitives
├── utils/        # Hooks, helpers, env management
└── config/       # ESLint, Prettier, Tailwind, tsconfig bases

specs/            # Feature specifications (spec-first workflow)
mcp/              # MCP 2.0 tool descriptors for AI agents
scripts/          # CLI utilities (provision, spec-apply, security)
```

**Key Principle**: Shared Zod schemas in `packages/types` drive validation across API routes, DB schemas, Postman collections, and UI forms. Never duplicate validation logic.

## Critical Workflows

### Spec-First Development (Non-Negotiable)

**Every material change originates from `/specs/[feature]/spec.md`**

1. Changes start in spec documents (`spec.md`, `plan.md`, `tasks.md`)
2. Code, schemas, API routes, and MCP tools trace back to spec requirements
3. Divergence between spec and implementation blocks merges
4. Before proposing code: **Read the relevant spec section first**

Example: Adding a new API endpoint requires:
- FR (Functional Requirement) in `spec.md`
- Zod schema in `packages/types/src/api/`
- Hono route in `apps/api/src/routes/`
- OpenAPI definition in `specs/[feature]/contracts/openapi.yaml`
- MCP tool descriptor (if AI-invocable) in `mcp/servers/`

### Environment Parity Model

Three canonical environments across ALL integrations:

| Environment | GitHub Branch | Cloudflare | Neon DB Branch | Postman Env |
|-------------|---------------|------------|----------------|-------------|
| dev         | feature/*     | preview    | dev            | dev         |
| staging     | staging       | staging    | staging        | staging     |
| prod        | main          | production | prod           | production  |

**Plus**: Ephemeral preview environments (`preview-<branchSlug>`) with TTL-based auto-archival.

**Promotion Flow**: dev → staging → prod (explicit, logged, reversible where supported)

### Idempotency Pattern

All provisioning operations use deterministic idempotency keys:

```typescript
const key = `${projectId}-${resource}-${environment}`
// Example: "123e4567-githubRepo-dev"
```

Resources: `githubRepo`, `githubCodespace`, `neonProject`, `neonBranch`, `cloudflareWorker`, `cloudflarePage`, `postmanWorkspace`, `postmanCollection`

**Collision Handling**: Return existing resource identifier without error (convergent behavior).

## Technology Stack Decisions

### Backend: Hono on Cloudflare Workers (NOT Express)

- **Why**: Edge-native, instant cold starts, no adapter complexity
- **Location**: `apps/api/src/`
- **DB Access**: Neon serverless driver (HTTP) via Drizzle ORM
- **Middleware Pipeline**: Structured logging (Pino), auth (BetterAuth), error handling, idempotency checks

**Common Mistake**: Don't suggest Express routes—this is a Workers-native Hono API.

### Frontend: Next.js 14 (App Router) + Expo (NativeWind)

- **Web**: `apps/web/` uses App Router, Server Components where applicable
- **Mobile**: `apps/mobile/` uses Expo Router with NativeWind for Tailwind styling
- **Shared UI**: `packages/ui/` contains cross-platform React Native primitives

**Styling**: Use NativeWind tokens from `packages/config/tailwind/` (unified theming).

### Testing Stack

- **Primary**: Vitest (unit + integration, fast TypeScript support)
- **Jest**: Only if React Native module requires it (compatibility fallback)
- **E2E**: Playwright for web flows
- **Contract**: Postman collections with CI validation

**Performance Targets**: See `specs/001-platform-bootstrap/spec.md` Success Criteria (SC-001 through SC-011).

## Security & Secrets

### Non-Negotiable Rules

1. **No secrets in logs** (enforced by redaction patterns + pre-commit hooks)
2. **No secrets in source control** (use Cloudflare secrets, GitHub Environments, Neon)
3. **Least privilege tokens** (scoped GitHub PATs, minimal Cloudflare API permissions)
4. **Audit all critical operations** (provision, deploy, promote, rollback with actor + correlationId)

### Secret Scanning

Pre-commit hook + CI validation: `scripts/security/scanSecrets.ts`

Patterns blocked: `AKIA[0-9A-Z]{16}`, `ghp_[A-Za-z0-9]{36}`, generic private keys

### JWT & Rotation

- Access tokens: HS256, ≤15min lifetime
- Refresh tokens: 24h
- Signing key rotation: Every 90 days (7-day grace period)
- Master encryption key (pgcrypto): Annual rotation with audit events

## MCP Tool Integration

**Location**: `mcp/servers/<provider>/<tool>.json`

All AI-invocable orchestration operations require MCP tool descriptors:

```json
{
  "name": "github.createRepo",
  "description": "Creates a GitHub repository from template",
  "inputSchema": { "$ref": "packages/types/src/mcp/github.ts#CreateRepoInput" },
  "outputSchema": { "$ref": "packages/types/src/mcp/github.ts#CreateRepoOutput" }
}
```

**When adding orchestration features**: Update both code AND MCP descriptors.

## Data Model Patterns

### Entity ID Strategy

**UUID v4 for ALL entities** (Project, Environment, IntegrationConfig, Deployment, Build, User, etc.)

```typescript
id: uuid('id').primaryKey().defaultRandom()
```

**Why**: Non-enumerable, distributed generation, Postgres UUID type support.

### Environment State Lifecycle

```
pending → provisioning → active → updating → validating → active
                                                ↓
                                             error → (retry) → updating
                                                ↓
                                            failed (terminal)
                                                ↓
                                            archived
```

**Rollback Flow**: `active → updating(rollback) → validating → active`

**Preview Environments**: Limited states (provisioning|active|error|archived), TTL-based expiry (default 72h).

## Observability & Error Handling

### Structured Logging

Every log entry includes:

```typescript
{
  timestamp: string,      // RFC3339
  level: "info|warn|error|critical",
  requestId: string,      // UUID per request
  traceId?: string,       // OpenTelemetry trace
  code?: string,          // Error taxonomy (ENV_*, INTEGRATION_*)
  durationMs?: number,
  projectId?: string,
  environmentId?: string
}
```

**Secret Redaction**: Automated masking before emission (denylist patterns).

### Error Response Envelope

```json
{
  "error": {
    "code": "ENV_PREVIEW_EXPIRED",
    "message": "Preview environment has expired.",
    "severity": "error",
    "retryPolicy": "none",
    "requestId": "b12f...",
    "timestamp": "2025-11-22T10:15:30Z",
    "context": { "environmentId": "...", "branch": "feature-x" },
    "hint": "Push a new commit to recreate the preview.",
    "causeChain": ["ENV_PREVIEW_TTL_EXPIRED"]
  }
}
```

**Never expose**: Stack traces, provider raw errors, internal IDs outside context map.

### Rate Limiting

Token bucket per-user (60/min, burst 120) and per-project (300/min, burst 600):

- Provisioning endpoints: 5 tokens
- Chat session start: 3 tokens
- Streaming sustain: 1 token per 10s
- Read-only: 1 token

**429 Response Headers**: `Retry-After`, `X-RateLimit-Remaining-User`, `X-RateLimit-Remaining-Project`

### Circuit Breaker Pattern

Per-integration circuit breaker:

- Opens after ≥10 failures within 60s
- Half-open probe after 30s
- State exposed via `GET /projects/{id}/environments`

**Error Code**: `INTEGRATION_<PROVIDER>_UNAVAILABLE` (severity=error, retryPolicy=none)

## Common Integration Points

### GitHub

- **Repo Creation**: Template clone from monorepo structure
- **Codespaces**: Provisioned with devcontainer.json (Node 20.x, pnpm)
- **Environments**: dev/staging/prod with secrets binding

### Cloudflare

- **Workers**: Hono API deployment (wrangler.toml in `apps/api/`)
- **Pages**: Next.js web app deployment
- **Preview URLs**: `https://preview-<branchSlug>.<projectId>.pages.dev`

### Neon

- **Branching**: dev/staging/prod branches from parent
- **Connection**: Serverless HTTP driver (no connection pooling needed)
- **Failover**: Warm standby branch + automated health checks (30s interval)

### Postman

- **Hybrid Structure**: Base collection + per-environment collections
- **Naming**: `CloudMake Base - <ProjectName>` and `CloudMake - <ProjectName> (dev|staging|prod)`
- **Sync**: API-driven collection updates from OpenAPI spec

## Development Commands

```bash
# Monorepo development (runs all apps concurrently)
pnpm dev

# Type checking across workspace
pnpm typecheck

# Linting
pnpm lint

# Testing
pnpm test              # Vitest unit + integration
pnpm test:e2e          # Playwright
pnpm test:postman      # Postman collection runs

# Build for production
pnpm build

# Provision new project (local script)
pnpm exec ts-node scripts/provision/createProject.ts --name "demo" --org default

# Apply spec changes (regenerate schemas/routes)
pnpm exec ts-node scripts/spec/apply.ts --project <projectId>

# Sync MCP tools
pnpm exec ts-node scripts/mcp/syncTools.ts --project <projectId>
```

## File Creation Patterns

### Adding a New API Endpoint

1. **Zod Schema**: `packages/types/src/api/<domain>.ts`
2. **Drizzle Model** (if new entity): `apps/api/db/schema/<entity>.ts`
3. **Service Logic**: `apps/api/src/services/<domain>Service.ts`
4. **Hono Route**: `apps/api/src/routes/<domain>/<action>.ts`
5. **OpenAPI Spec**: `specs/001-platform-bootstrap/contracts/openapi.yaml`
6. **API Client Method**: `packages/api-client/src/resources/<domain>.ts`
7. **Tests**: `apps/api/src/routes/<domain>/<action>.test.ts`

### Adding a Shared Component

1. **Component**: `packages/ui/src/<ComponentName>.tsx`
2. **Types**: `packages/types/src/components/<domain>.ts` (if complex props)
3. **Export**: Add to `packages/ui/src/index.ts`
4. **Storybook** (future): `packages/ui/src/<ComponentName>.stories.tsx`

## Constitution Compliance Checklist

Before proposing changes, verify:

- [ ] Change traces to a spec requirement (FR-###, SC-###, or user story)
- [ ] Environment parity maintained (dev/staging/prod consistency)
- [ ] MCP tool descriptor updated (if orchestration feature)
- [ ] Security review (no secret leaks, audit logging present)
- [ ] Observability (structured logs, correlation IDs, metrics)
- [ ] Idempotency (provisioning operations convergent)
- [ ] No new packages without complexity table justification

## Quick Reference: Key Files

| Purpose | Location |
|---------|----------|
| Constitution (principles) | `.specify/memory/constitution.md` |
| Current feature spec | `specs/001-platform-bootstrap/spec.md` |
| Implementation plan | `specs/001-platform-bootstrap/plan.md` |
| Task breakdown | `specs/001-platform-bootstrap/tasks.md` |
| Research decisions | `specs/001-platform-bootstrap/research.md` |
| Data model | `specs/001-platform-bootstrap/data-model.md` |
| API contracts | `specs/001-platform-bootstrap/contracts/openapi.yaml` |
| Hono app entry | `apps/api/src/app.ts` |
| Next.js root | `apps/web/app/layout.tsx` |
| Expo root | `apps/mobile/app/_layout.tsx` |
| Shared types | `packages/types/src/index.ts` |
| MCP config | `mcp/config.json` |

## Common Pitfalls to Avoid

❌ Suggesting Express routes (use Hono)  
❌ Duplicating Zod schemas (use `packages/types`)  
❌ Hardcoding secrets in code (use env vars + secret stores)  
❌ Creating non-idempotent provisioning logic  
❌ Adding code without corresponding spec section  
❌ Breaking environment parity (dev/staging/prod consistency)  
❌ Forgetting MCP tool descriptors for AI-invocable features  
❌ Exposing stack traces or internal errors in API responses  
❌ Using offset pagination (use cursor-based)  
❌ Auto-increment IDs (use UUID v4)  

## Next Steps for New Features

1. Create spec document in `specs/<###-feature>/spec.md`
2. Run `/speckit.plan` to generate implementation plan
3. Run `/speckit.tasks` to break down into granular tasks
4. Implement in phases (Setup → Foundational → User Stories → Polish)
5. Update MCP tools and OpenAPI contracts as you go
6. Ensure tests validate success criteria from spec

---

**Remember**: CloudMake is dogfooding itself. Improvements to the platform's template propagate to all future projects. Code with care.

## GitHub Secrets & Environments: Agent Usage Patterns (Feature 002)

### Core Endpoints (Secrets + Validation + Environments)

| Purpose | Method & Path | Typical Input | Typical Output | Idempotent? |
|---------|---------------|---------------|----------------|-------------|
| Bulk secret sync (Actions → Codespaces/Dependabot/Cloudflare) | POST /github/secrets/sync | `{ projectId: string, force?: boolean }` | `{ synced: number, skipped: number, conflicts: number, durationMs: number, quotaRemaining: number }` | Yes |
| Sync status snapshot | GET /github/secrets/sync/status?projectId=... | query `projectId` | Aggregated counts, quota, last sync times | Yes |
| Environment provisioning (dev/staging/prod) | POST /github/environments | `{ projectId, environments: [ { name: 'dev', reviewers?: string[] } ] }` | `{ created: string[], updated: string[], conflicts?: string[] }` | Yes (create-or-update) |
| Secret validation + conflict detection | POST /github/secrets/validate | `{ projectId, scopes?: string[] }` | `{ missing: string[], conflicts: Array<{ name: string, scopes: string[] }>, remediation: string[] }` | Cached 5m |

### Agent Invocation Guidance

1. ALWAYS read spec at `specs/002-github-secrets-sync/spec.md` before suggesting changes.
2. For automation flows: call validation FIRST, then sync if remediation requires it.
3. For environment provisioning: generate stable idempotency key = `${projectId}-environment-${envName}` internally; do not re-implement.
4. Back off on sync operations if quota service reports insufficient remaining calls.

### Error Taxonomy Quick Reference (codes defined in `apps/api/src/types/errors.ts`)

| Category | Example Codes | Retry Policy | Agent Action |
|----------|---------------|--------------|--------------|
| Secrets | GITHUB_SECRETS_RATE_LIMIT_EXHAUSTED, GITHUB_SECRETS_ENCRYPTION_FAILED | after_delay / exponential_backoff | Surface wait time; schedule retry respecting `Retry-After` |
| Environments | GITHUB_ENV_REVIEWER_NOT_FOUND, GITHUB_ENV_PROTECTION_CONFLICT | none | Prompt user to adjust reviewers / protection rules |
| Validation | GITHUB_VALIDATION_CONFLICT_DETECTED | manual | Present remediation steps before deployment |
| Integration | GITHUB_INTEGRATION_UNAVAILABLE | none | Fail fast; offer diagnostics (check PAT scopes) |

### Troubleshooting Cheatsheet

| Symptom | Probable Cause | Diagnostic Step | Resolution |
|---------|----------------|-----------------|-----------|
| Encryption failed | Public key stale or sodium failure | Re-fetch /repos/:owner/:repo/actions/secrets/public-key | Retry with fresh key (cache TTL 5m) |
| Secrets missing in target scopes | Exclusion pattern matched or prior sync failure | Check secret_exclusion_patterns table & last sync event | Remove pattern or re-run sync with `force` |
| Validation conflicts persist | Stale hash in secret_mappings | Trigger full sync (not incremental) | Run POST /github/secrets/sync with `force:true` |
| Rate limit exhaustion | Burst of parallel syncs | Inspect quotaService and GitHub headers | Stagger operations, apply jitter |
| Environment not updating reviewers | Protection rule mismatch | GET environment details (audit log) | Re-run provisioning; ensure reviewer GitHub IDs valid |

### Safe Operation Rules

1. NEVER log raw secret values; only names + hashed digests (SHA-256) are permitted.
2. ALWAYS attach correlationId to sync + validate operations for cross-log diffusion.
3. Respect exponential backoff: base delay 1000ms, multiplier 2, jitter ±20%, max 3 attempts (services already implement).
4. Treat all sync operations as convergent: no duplicate writes, absence of error implies stable state.
5. Use validation before deployment gating (staging/prod) to enforce SC-005, SC-008.

### Agent Decision Flow (Pseudocode)

```text
IF goal == "ensure secrets healthy" THEN
  validation = POST /github/secrets/validate
  IF validation.missing.length + validation.conflicts.length == 0 THEN
     RETURN "Healthy"
  ELSE
     sync = POST /github/secrets/sync (force if conflicts)
     RETURN sync.summary
ENDIF

IF goal == "provision environments" THEN
  POST /github/environments (idempotent)
  VERIFY via GET /github/secrets/sync/status
ENDIF

IF issue == rate_limit THEN
  WAIT per `Retry-After` or apply backoff schedule
  REISSUE previous request with same parameters
ENDIF
```

### Data Integrity Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| Idempotent secret sync | Compare value hash before write; skip unchanged |
| Conflict detection | SHA-256 digest comparison across scopes |
| Exclusion enforcement | Regex evaluation against DB-driven patterns |
| Quota safety | quotaService.checkQuota() gating writes |
| Audit trail | secret_sync_events (operationType, duration, counts) |

### When NOT To Retry Automatically

- Reviewer / protection rule errors (user configuration required)
- Validation conflict after force sync (indicates external mutation)
- Integration unavailable (permission / token scope issue)

### Required PAT Scopes for GitHub Operations

| Operation | Required Scopes |
|-----------|-----------------|
| Actions secrets read/write | `repo`, `actions` |
| Codespaces secrets write | `repo`, `codespaces` |
| Dependabot secrets write | `repo`, `dependabot` |
| Environment provisioning | `repo` |

### Redaction Patterns (Middleware)

Patterns include generic API keys, AWS keys, GitHub tokens, connection strings. Agents MUST avoid echoing any value matching these patterns back to users.

### Deployment Readiness Gates (Feature 002)

| Gate | Condition |
|------|-----------|
| Staging deploy allowed | Validation report has no missing secrets |
| Prod deploy allowed | Validation report clean AND environments provisioned |

---
