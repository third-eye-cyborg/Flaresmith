# Implementation Plan: GitHub Secrets Synchronization & Environment Configuration

**Branch**: `002-github-secrets-sync` | **Date**: 2025-11-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-github-secrets-sync/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature implements automated GitHub secret synchronization across repository scopes (Actions, Codespaces, Dependabot) and environment-specific configuration for multi-environment workflows (dev, staging, production). The system eliminates manual secret duplication, reducing setup time by 80% while ensuring environment isolation and deployment protection rules. Core capabilities include idempotent secret sync with retry logic, environment-specific resource binding to Cloudflare/Neon, secret validation/conflict detection, and comprehensive audit logging.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, ES2022 target)  
**Primary Dependencies**: 
- Hono 4.x (Cloudflare Workers runtime for API endpoints)
- Octokit 3.x (GitHub REST API client for secret management)
- Drizzle ORM (Neon Postgres schema/queries for audit tables)
- Zod 3.x (validation schemas in `packages/types`)

**Storage**: 
- Neon Postgres (audit tables: `secret_sync_events`, `github_environments`, `secret_mappings`, `environment_configurations`)
- GitHub native storage (repository secrets, environment secrets, environment protection rules)

**Testing**: 
- Vitest (unit tests for sync logic, validation, conflict detection)
- Postman collections (contract tests for secret sync API endpoints)
- GitHub API mocking (nock or msw for integration tests)

**Target Platform**: 
- Cloudflare Workers (edge-native Hono API)
- GitHub repository automation (triggered via webhooks or scheduled jobs)

**Project Type**: Monorepo extension (apps/api + packages/types + mcp/servers)

**Performance Goals**: 
- Secret sync completes within 5 minutes for up to 50 secrets
- Environment provisioning completes within 5 minutes for 3 environments
- Validation reports generated in under 10 seconds
- API p95 < 300ms for sync status queries

**Constraints**: 
- GitHub API rate limits: 5000/hour authenticated (primary quota enforced by GitHub)
- Secondary rate limits: 100 creates/hour for secrets API (enforced by GitHub)
- Idempotent operations required (retry-safe)
- Zero secret values in logs (100% redaction compliance)
- Manual approval required for staging/prod deployments

**Scale/Scope**: 
- Support up to 100 secrets per repository
- Handle 50+ concurrent projects with secret sync
- Support 3 core environments + up to 15 preview environments per project
- Audit retention: 90 days for secret sync events

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The following MUST be explicitly addressed referencing the Flaresmith Constitution principles:

### 1. Spec-First Orchestration ✅ PASS

**Confirmation**: Spec directory exists at `/specs/002-github-secrets-sync/` with complete user stories (3 prioritized scenarios), functional requirements (FR-001 through FR-015), and measurable success criteria (SC-001 through SC-010).

**Spec File Paths**:
- `/specs/002-github-secrets-sync/spec.md` (feature specification)
- `/specs/002-github-secrets-sync/checklists/requirements.md` (quality validation - all checks passed)
- `/specs/002-github-secrets-sync/plan.md` (this implementation plan)
- Future artifacts: `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`

**Traceability**: All code artifacts will reference FR-### requirements in commit messages and PR descriptions.

### 2. Environment Parity & Idempotent Automation ✅ PASS

**New Resources Per Environment**:

| Resource Type | Dev | Staging | Production | Provisioning Method |
|---------------|-----|---------|------------|---------------------|
| GitHub Environment | `dev` | `staging` | `production` | GitHub Environments API (idempotent create) |
| Environment Secrets | NEON_BRANCH_ID (dev branch), CLOUDFLARE_WORKER_NAME (api-dev), CLOUDFLARE_PAGES_PROJECT (web-dev) | NEON_BRANCH_ID (staging branch), CLOUDFLARE_WORKER_NAME (api-staging), CLOUDFLARE_PAGES_PROJECT (web-staging) | NEON_BRANCH_ID (prod branch), CLOUDFLARE_WORKER_NAME (api-prod), CLOUDFLARE_PAGES_PROJECT (web-prod) | GitHub Environment Secrets API (upsert semantics) |
| Protection Rules | None (auto-deploy) | 1 required reviewer | 1 required reviewer + main branch only | GitHub Environment Protection API (idempotent update) |
| Repository Secrets (shared) | GITHUB_APP_ID, CLOUDFLARE_API_TOKEN, NEON_API_KEY, POSTMAN_API_KEY, MASTER_ENC_KEY, JWT_SIGNING_KEY | Same (synced from Actions scope) | Same (synced from Actions scope) | GitHub Secrets API for Actions/Codespaces/Dependabot |

**Idempotent Creation Strategy**:
- Use idempotency key pattern: `{projectId}-github-env-{environment}` for environment creation
- Secret sync operations use GitHub API's native upsert behavior (PUT replaces existing)
- Database audit records use `ON CONFLICT (idempotencyKey) DO UPDATE` for event recording
- All operations retryable with exponential backoff (max 3 attempts)
- Operation convergence: repeated calls result in same final state without errors

**Environment Parity Guarantee**: All three environments (dev/staging/prod) maintain identical structure with only values differing (branch IDs, worker names, protection rules).

### 3. Tool-/MCP-Centric AI Workflow ✅ PASS

**Required MCP Tool Additions/Updates**:

| Tool Name | Purpose | Input Schema Summary | Output Schema Summary |
|-----------|---------|---------------------|----------------------|
| `github.syncSecrets` | Synchronize repository secrets across Actions/Codespaces/Dependabot scopes | `{ projectId: uuid, sourceScope: "actions", excludePatterns?: string[] }` | `{ syncedCount: number, skippedCount: number, errors: Array<{secretName, scope, error}> }` |
| `github.createEnvironments` | Create dev/staging/prod GitHub environments with protection rules | `{ projectId: uuid, environments: Array<{name, protectionRules, secrets}> }` | `{ created: string[], updated: string[], errors: Array<{environment, error}> }` |
| `github.validateSecrets` | Validate secret presence and consistency across scopes | `{ projectId: uuid, requiredSecrets: string[] }` | `{ valid: boolean, missing: Array<{secretName, scope}>, conflicts: Array<{secretName, scopes, diff}> }` |
| `github.getSecretSyncStatus` | Query current sync status and last sync timestamp | `{ projectId: uuid }` | `{ lastSyncAt: datetime, status: "synced"\|"pending"\|"error", pendingCount: number }` |

**MCP Descriptor Locations**: `/mcp/servers/github/syncSecrets.json`, `/mcp/servers/github/createEnvironments.json`, `/mcp/servers/github/validateSecrets.json`, `/mcp/servers/github/getSecretSyncStatus.json`

**Integration**: MCP tools will be invoked by project provisioning workflow and exposed to AI agents for troubleshooting/manual sync operations.

### 4. Security, Observability & Audit ✅ PASS

**Secrets/Credentials Touched**:
- GitHub App private key (read-only from Cloudflare secrets binding)
- GitHub Personal Access Token (if used instead of App, read-only from env)
- Cloudflare API tokens (referenced in environment secrets, not handled directly)
- Neon API keys (referenced in environment secrets, not handled directly)
- All repository secrets (read from Actions, written to Codespaces/Dependabot)

**Least-Privilege Approach**:
- GitHub App/PAT requires minimal scopes: `repo` (for environments), `admin:repo_hook` (for webhooks if needed), `secrets` (for secret management)
- No secrets are stored in Flaresmith database (only sync event metadata)
- Secret values redacted from all logs using regex patterns before emission
- API endpoints require project-scoped authentication (user must have developer+ role)

**Required Logs/Metrics**:

Logs (structured JSON via Pino):
- `github.secrets.sync.started` - { projectId, sourceScope, targetScopes[], secretCount, correlationId }
- `github.secrets.sync.completed` - { projectId, syncedCount, skippedCount, errors[], durationMs, correlationId }
- `github.secrets.sync.failed` - { projectId, error, retryAttempt, correlationId }
- `github.environment.created` - { projectId, environmentName, protectionRules, correlationId }
- `github.secrets.validation.completed` - { projectId, valid, missingCount, conflictCount, correlationId }

Metrics (tracked in `secret_sync_events` table):
- Total sync operations per hour
- Sync success rate (percentage)
- Average sync duration
- Secrets synced per operation
- Validation failure rate

Audit Trail (database records):
- `secret_sync_events` table: actor, timestamp, operation type, affected scopes, secret names (NOT values), outcome, correlationId
- Retention: 90 days

**Secret Redaction Enforcement**:
- Pre-commit hook scans for secret patterns
- Middleware redacts known secret env vars before logging
- API responses never include secret values (only metadata like name, scope, last updated)

### 5. Monorepo Simplicity & Reusable Primitives ✅ PASS

**No New Packages Required**: This feature extends existing monorepo structure without adding packages.

**Shared Primitives Usage**:
- `packages/types/src/github/` - Zod schemas for secret sync requests/responses, environment configs, validation reports
- `packages/types/src/api/` - API route schemas for secret management endpoints
- `packages/api-client/src/resources/github.ts` - Typed client methods for secret sync operations
- `apps/api/src/services/github/secretSyncService.ts` - Core sync logic (new service)
- `apps/api/src/services/github/environmentService.ts` - Environment provisioning logic (new service)
- `apps/api/db/schema/secretSync.ts` - Drizzle schema for audit tables (new schema file)

**Zod Schema Reuse Strategy**:
1. Define `SecretSyncRequest`, `SecretSyncResponse`, `EnvironmentConfig`, `SecretValidationReport` in `packages/types`
2. Import in API routes for request validation
3. Import in Postman collection generation scripts
4. Import in MCP tool descriptors for input/output schemas
5. Import in UI forms (future dashboard features)

**No Complexity Table Entries Required**: Feature fits within established patterns (services, schemas, routes, MCP tools).

---

**GATE EVALUATION**: ✅ ALL GATES PASSED - Proceed to Phase 0 Research

## Project Structure

### Documentation (this feature)

```text
specs/002-github-secrets-sync/
├── spec.md              # Feature specification (COMPLETED)
├── checklists/
│   └── requirements.md  # Quality validation checklist (COMPLETED)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (PENDING - will be generated below)
├── data-model.md        # Phase 1 output (PENDING - will be generated below)
├── quickstart.md        # Phase 1 output (PENDING - will be generated below)
├── contracts/           # Phase 1 output (PENDING - will be generated below)
│   ├── openapi.yaml     # API contract for secret sync endpoints
│   └── schemas/         # JSON schemas for MCP tool descriptors
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/api/
├── db/
│   └── schema/
│       └── secretSync.ts              # NEW: Drizzle schema for audit tables
├── src/
│   ├── routes/
│   │   └── github/
│   │       ├── syncSecrets.ts         # NEW: POST /github/secrets/sync
│   │       ├── createEnvironments.ts  # NEW: POST /github/environments
│   │       ├── validateSecrets.ts     # NEW: POST /github/secrets/validate
│   │       └── getSecretSyncStatus.ts # NEW: GET /github/secrets/sync/status
│   ├── services/
│   │   └── github/
│   │       ├── secretSyncService.ts       # NEW: Core secret synchronization logic
│   │       ├── environmentService.ts      # NEW: Environment provisioning logic
│   │       └── secretValidationService.ts # NEW: Validation and conflict detection
│   └── middleware/
│       └── secretRedaction.ts         # NEW: Log redaction for secret values

packages/types/src/
├── github/
│   ├── secretSync.ts        # NEW: Zod schemas for sync operations
│   ├── environments.ts      # NEW: Zod schemas for environment config
│   └── validation.ts        # NEW: Zod schemas for validation reports
└── api/
    └── github.ts            # NEW: API route request/response schemas

packages/api-client/src/
└── resources/
    └── github.ts            # EXTENDED: Add secret sync methods

mcp/servers/github/
├── syncSecrets.json         # NEW: MCP tool descriptor
├── createEnvironments.json  # NEW: MCP tool descriptor
├── validateSecrets.json     # NEW: MCP tool descriptor
└── getSecretSyncStatus.json # NEW: MCP tool descriptor

scripts/
└── github/
    └── syncSecretsScheduled.ts # NEW: Scheduled job for automatic sync
```

**Structure Decision**: Extends existing monorepo structure with new GitHub-specific services, routes, and schemas. No new top-level packages required. Follows established pattern of `apps/api/src/routes/{provider}/{action}.ts` for API endpoints and `packages/types/src/{domain}/{resource}.ts` for shared schemas. MCP tool descriptors located under `/mcp/servers/{provider}/` as per existing conventions.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations detected. Complexity table not required.**

This feature extends existing monorepo structure following established patterns:
- Services layer (`apps/api/src/services/github/`)
- Route handlers (`apps/api/src/routes/github/`)
- Shared Zod schemas (`packages/types/src/github/`)
- MCP tool descriptors (`mcp/servers/github/`)
- Database schemas (`apps/api/db/schema/`)

No new packages, frameworks, or architectural deviations introduced.

---

## Post-Design Constitution Re-Check

**Status**: ✅ ALL GATES STILL PASSED

### Design Artifacts Produced

**Phase 0 (Research)**:
- `/specs/002-github-secrets-sync/research.md` - 12 decisions covering GitHub API patterns, encryption, exclusions, retry logic, rate limits, audit storage, and more

**Phase 1 (Design & Contracts)**:
- `/specs/002-github-secrets-sync/data-model.md` - 6 new entities (SecretMapping, GitHubEnvironmentConfig, SecretSyncEvent, SecretExclusionPattern, GitHubApiQuota, extended Environment), complete validation rules, error taxonomy, database migrations, Zod schemas
- `/specs/002-github-secrets-sync/contracts/openapi.yaml` - OpenAPI 3.1 spec with 4 endpoints (sync, status, environments, validate), comprehensive request/response schemas, error responses
- `/specs/002-github-secrets-sync/quickstart.md` - Developer guide covering typical workflows, API usage, environment configuration, troubleshooting, best practices

### Constitution Compliance Verification

1. **Spec-First Orchestration** ✅
   - All design artifacts trace back to FR-001 through FR-015 in spec.md
   - Data model entities directly implement Key Entities from spec
   - API endpoints map 1:1 to functional requirements
   - No implementation code created yet (design phase only)

2. **Environment Parity & Idempotent Automation** ✅
   - Environment configuration table enforces dev/staging/prod structure
   - GitHub API integration uses native upsert semantics (PUT requests)
   - Idempotency keys used for sync operations (`{projectId}-github-env-{environment}`)
   - All operations documented as retry-safe in research.md (D-005)

3. **Tool-/MCP-Centric AI Workflow** ✅
   - 4 MCP tools planned: syncSecrets, createEnvironments, validateSecrets, getSecretSyncStatus
   - Input/output schemas defined in data-model.md (Zod schemas)
   - Tool descriptors will be created in implementation phase at `/mcp/servers/github/`
   - OpenAPI contract provides machine-readable API surface for tool generation

4. **Security, Observability & Audit** ✅
   - Secret values NEVER stored in database (only SHA-256 hashes for conflict detection)
   - Comprehensive redaction middleware planned (D-012 in research.md)
   - Audit table `secret_sync_events` with 90-day retention
   - Structured logging with correlation IDs
   - Error taxonomy includes severity and retry policy for each code
   - Least-privilege GitHub App permissions documented in Constitution Check

5. **Monorepo Simplicity & Reusable Primitives** ✅
   - Zero new packages added
   - Shared Zod schemas in `packages/types` (single source of truth)
   - Services follow existing `apps/api/src/services/{provider}/{action}Service.ts` pattern
   - Database migrations extend existing Drizzle schema approach
   - No architectural deviations or framework additions

### Design Quality Assessment

**Completeness**:
- All 15 functional requirements (FR-001 through FR-015) have corresponding data model entities, API endpoints, or service logic
- All 8 edge cases from spec addressed in research decisions (rate limits, partial failures, conflicts, etc.)
- Success criteria SC-001 through SC-010 are measurable via API responses and audit data

**Consistency**:
- Naming conventions align with platform bootstrap (camelCase for code, snake_case for database)
- Error codes follow established taxonomy (CATEGORY_SUBCATEGORY pattern)
- UUID v4 for all entities (consistent with platform)
- Timestamps in ISO 8601 UTC (consistent with platform)

**Traceability**:
- Every design decision in research.md references a functional requirement or edge case
- Data model entities map to Key Entities in spec.md
- API endpoints implement user stories (P1: sync, P2: environments, P3: validate)
- Quickstart guide sections correspond to acceptance scenarios

**Implementability**:
- Database migrations are executable SQL (PostgreSQL with Neon extensions)
- Zod schemas are valid TypeScript
- OpenAPI spec validated successfully (swagger-cli)
- No unresolved dependencies or "NEEDS CLARIFICATION" markers

---

## Phase 2 Readiness

**This plan concludes at Phase 1 (Design & Contracts).** Next step is to run:

```bash
/speckit.tasks
```

This will generate `tasks.md` with granular implementation tasks grouped by:
- P1 User Story: Automated Secret Distribution (MVP)
- P2 User Story: Environment-Specific Configuration
- P3 User Story: Secret Validation & Conflict Detection

Each task will be independently testable and reference specific files/functions to create or modify.

---

## Delivery Checklist

- [x] Technical Context filled (language, dependencies, platform, constraints)
- [x] Constitution Check completed (all 5 principles validated, no violations)
- [x] Phase 0: research.md generated (12 decisions, no clarifications remaining)
- [x] Phase 1: data-model.md generated (6 entities, migrations, Zod schemas)
- [x] Phase 1: contracts/openapi.yaml generated (4 endpoints, validated)
- [x] Phase 1: quickstart.md generated (developer workflows, API usage, troubleshooting)
- [x] Agent context updated (.github/agents/copilot-instructions.md)
- [x] Post-design Constitution re-check (all gates still passed)
- [ ] Phase 2: tasks.md (NOT created by /speckit.plan - requires /speckit.tasks command)

**Plan Status**: ✅ COMPLETE - Ready for task breakdown
