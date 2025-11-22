# Implementation Plan: Platform Bootstrap

**Branch**: `001-platform-bootstrap` | **Date**: 2025-11-21 | **Spec**: `specs/001-platform-bootstrap/spec.md`
**Input**: CloudMake orchestration platform blueprint + feature spec

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

Update 2025-11-21 (Session 1): Constitution tech stack now aligned (Express removed; Hono adopted). Duplicate requirement FR-020 consolidated in spec; idempotency key pattern, drift report schema, pagination example, preview URL pattern, rate limit headers, and secret audit schema added to specification for clarity.

Update 2025-11-21 (Session 2): Spec refinement completed removing FR-020 duplication, correcting Express references to Hono in User Story 3, adding FR-023 secrets response schema (with masking pattern), enhancing FR-021 with resource segment enumeration, adding preview TTL configuration bounds (24h-168h), Postman naming convention, preview cap overflow handling (409 + ENV_PREVIEW_LIMIT_REACHED), clarifying SC-009 baseline window (60s pre/during), SC-011 accuracy denominator (audit vs metrics), and FR-036 origin field (user|system).

## Summary

Bootstrap the CloudMake platform monorepo enabling spec‑first orchestration of GitHub repos, Cloudflare Workers/Pages, Neon Postgres branches, Postman collections, and MCP tool descriptors. Deliver initial provisioning flow (project creation), environment dashboard, spec apply pipeline, and AI chat/editor foundation. Technical approach: Turborepo + pnpm, shared packages (ui, types, api-client, utils, config), Hono (Cloudflare Workers runtime) + Drizzle + Neon HTTP driver, Expo + Next.js hybrid frontends, MCP 2.0 directory for tool discovery, automated spec→code sync using Spec Kit + codegen modules.

## Technical Context

**Language/Version**: TypeScript (Node 20.x / Next.js 14 / Expo SDK latest; Cloudflare Workers runtime)  
**Primary Dependencies**: Next.js, Expo Router, React Native Web, NativeWind, Hono (Workers), Drizzle ORM, Neon serverless (HTTP driver), Zod, Turborepo, pnpm, BetterAuth, CodeMirror 6, Postman SDK, Spec Kit (specify), Cloudflare Workers/Pages APIs, GitHub REST/GraphQL, internal MCP client (WebSocket + JSON-RPC per research.md D-006), OpenTelemetry JS (metrics + tracing SDK), pino-like structured logger, pgcrypto (via SQL functions)  
**Storage**: Neon Postgres (branching: dev/staging/prod) + encrypted secrets metadata table (pgcrypto AES-GCM)  
**Testing**: Vitest (unit + integration), Playwright (e2e), Postman CLI (API contract); Jest only if React Native module incompatibility (per research.md D-004). Test coverage: performance suite (T132) validates SC-001..SC-010; security tests (T163 key rotation, T164 redaction, T170 audit schema); environment tests (T165 preview TTL expiry, T166 state machine transitions); reliability tests (T167 rate limit latency p95 <5ms); spec validation tests (T169 drift report schema); promotion lineage UI (T168). Additional coverage identified: rollback integration test, circuit breaker half-open transition test, idempotency convergence test, pagination correctness test, Postman hybrid structure validation test, preview cap enforcement test.  
**Target Platform**: Codespaces dev (Ubuntu container), Production: Cloudflare Workers (Hono) / Pages + Neon + GitHub Actions CI  
**Project Type**: Monorepo (web + mobile + api + shared packages)  
**Performance Goals**: Provisioning < 90s p95; environment dashboard < 500ms p95; spec apply < 30s baseline; API p95 < 300ms; chat diff cycle < 5s (<10 files); rate limit overhead <5ms p95; telemetry export flush ≤5s  
**Constraints**: Idempotent provisioning; no secrets in logs; memory per Worker < 128MB typical; CodeMirror lazy-load (>1MB via range requests per research.md D-003); 5% base trace sampling (error/slow forced)  
**Scale/Scope**: Target initial 100 projects / 300 stable environments + ≤15 concurrent preview environments per project (TTL 72h default, configurable 24h-168h); design for horizontal scaling of stateless API (Cloudflare Workers) and Neon serverless driver connection multiplexing.
**Security & Rotation**: JWT signing key rotation every 90d (7d grace, purge after grace+1d); master encryption key annual rotation (audit event); secret read/write audited.
**Observability Stack**: Structured JSON logs (requestId, traceId, code, durationMs) + OpenTelemetry metrics (histograms/counters) + tracing (root span per request, child spans per integration) exported OTLP batch with jittered backoff retry.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The following MUST be explicitly addressed referencing the CloudMake Constitution principles:

1. Spec-First Orchestration: Confirm spec directory exists for this feature with user stories, requirements, success criteria. List spec file paths.
2. Environment Parity & Idempotent Automation: Enumerate any new resources per env (dev/staging/prod) and describe idempotent creation strategy.
3. Tool-/MCP-Centric AI Workflow: List required MCP tool additions/updates (name, purpose). Provide input/output schema summaries.
4. Security, Observability & Audit: List secrets/credentials touched; confirm least-privilege approach; define required logs/metrics.
5. Monorepo Simplicity & Reusable Primitives: Justify any new package/folder beyond existing `apps` / `packages` primitives; if added, fill complexity table below.

If any gate fails, STOP and revise the spec or propose an amendment.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/
├── web/            # Next.js app (app router + CodeMirror + dashboard + chat wrapper)
├── mobile/         # Expo app (environment monitoring + notifications)
├── api/
    ├── src/        # Hono routes, services, middleware
    └── db/         # Drizzle schema, migrations, connection (Neon HTTP driver)

packages/
├── ui/             # Shared RN primitives & dashboard components
├── types/          # Zod schemas + TS types (entities, API payloads, MCP tool IO)
├── api-client/     # Typed fetch/axios wrapper w/ Zod validation
├── utils/          # Hooks (usePollingStatus), date/formatting, env helpers
├── config/         # tsconfig bases, eslint, prettier, tailwind, nativewind theme tokens

mcp/
├── config.json     # MCP servers + tool registration
└── servers/        # github/, cloudflare/, neon/, postman/, codespaces/, specs/, chat/

specs/              # Project specs (feature directories)
scripts/            # CLI utilities (provision, apply-spec)
.github/workflows/  # CI (lint, typecheck, test, postman, deploy)
devcontainer.json   # Codespaces tooling definition
turbo.json          # Pipeline configuration
pnpm-workspace.yaml # Workspace packages
tsconfig.json       # Root TS config
package.json        # Root scripts: dev, build, lint, typecheck, test
README.md           # Overview & Quickstart
SECURITY.md         # Security & secrets policy
CONTRIBUTING.md     # Contribution + spec-first workflow
```

**Structure Decision**: Adopt multi-app + shared packages monorepo as listed. Each path directly supports principles: spec-first (specs/), MCP tool discovery (mcp/servers), environment parity (apps/api + infra scripts), simplicity (limited package set). No extra foundational packages added.

### Clarified Decisions (Session 2025-11-21)
- Backend framework/runtime: Hono on Cloudflare Workers (edge-native, no Express adapter)
- Postman collections: Hybrid structure (base collection + per-environment collections). Naming: base `CloudMake Base - <ProjectName>`; environments `CloudMake - <ProjectName> (dev|staging|prod)`; folders organized by domain.
- Entity IDs: UUID v4 across all entities
- Pagination: Cursor-based (opaque cursor + limit; hasMore + nextCursor)
- WebSocket auth: JWT passed via URL query parameter
- MCP client: Thin internal implementation using WebSocket + JSON-RPC (research.md D-006)
- Testing stack: Vitest primary; Jest only for React Native incompatibility (research.md D-004)
- CodeMirror large files: Lazy load with GitHub API range requests for >1MB files (research.md D-003)
- Idempotency: Neon table `idempotency_keys` with unique constraint (research.md D-007). Resource segments: `githubRepo`, `githubCodespace`, `neonProject`, `neonBranch`, `cloudflareWorker`, `cloudflarePage`, `postmanWorkspace`, `postmanCollection`. Collision rule: return existing resource ID.
- Logging: Structured JSON via pino-compatible logger with correlationId propagation (research.md D-008)
- Environment lifecycle: States pending → provisioning → active → updating → validating → (active | error); error may retry or escalate to failed; archived is terminal retire state; rollback flows updating(rollback) → validating → active.
- Reliability SLO: 99.5% monthly uptime (RTO <5m, RPO <1m) with automated health checks every 30s and failover after 3 consecutive failures (FR-031).
- External failure handling: Exponential backoff with full jitter (100ms→1600ms, 5 attempts) + per-integration circuit breaker (open after 10 failures/60s, half‑open probe after 30s) (FR-032).
- Rate limiting: Token buckets per-user (60/min, burst 120) and per-project (300/min, burst 600) with endpoint weights, 429 + Retry-After headers (FR-033).
- Preview TTL: Default 72h; configurable min 24h, max 168h via project setting `previewTtlHours` or global env var `CM_PREVIEW_TTL_HOURS`.
- Preview Cap: Hard limit 15 concurrent; 16th creation returns 409 `ENV_PREVIEW_LIMIT_REACHED`; manual archive available to Maintainer+.
- Security enforcement: Pre-commit + CI secret scanning; structured logging with correlation IDs; audit events on provisioning.

### Clarified Decisions (Session 2025-11-22)
- Error Envelope: Unified JSON structure (code, message, severity, retryPolicy, requestId, timestamp, context, hint, causeChain[], optional details) excluding stack traces from responses.
- Observability Instrumentation: Full telemetry (logs + metrics + tracing) with W3C Trace Context propagation on outbound integration calls; 5% parent-based sampling; forced sample for error/slow operations.
- Security Posture: Managed secrets (Cloudflare, GitHub Actions & Environment Secrets, Neon) + HS256 JWT access tokens (≤15m) + refresh tokens (24h) + key rotation (90d, grace 7d, purge after grace+1d) + encrypted secrets metadata (pgcrypto AES-GCM). GitHub environment vs workflow secrets represented distinctly.
- Secret Masking Format: Fixed 8-char prefix for tokens (`ghp_****`); constant `****` for others; Viewer sees masked; Maintainer/Owner see last 4 chars.
- Circuit Breaker Baseline (SC-009): First 60s pre-open vs next 60s while open.
- Audit Log Accuracy (SC-011): Denominator = successful operations in audit table vs `secret_access_total` metric.
- Secret Audit Origin: `user|system` field differentiates manual vs automated actions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The following MUST be explicitly addressed referencing the CloudMake Constitution principles:

1. Spec-First Orchestration: Spec at `specs/001-platform-bootstrap/spec.md` (stories P1–P4, FR-001..FR-036, SC-001..SC-011). Artifacts trace requirements & success criteria including telemetry & security.
2. Environment Parity & Idempotent Automation: Resources: GitHub repo branches (main, staging, feature/*), GitHub environments (dev/staging/prod), Neon branches (dev/staging/prod), Cloudflare Workers & Pages deployments per env, Postman environments. Each create operation uses idempotency key pattern `<projectId>-<resource>-<env>`; retries check existence then converge.
3. Tool-/MCP-Centric AI Workflow: Initial MCP tools: github.listRepos, github.createRepo, cloudflare.deployWorker, neon.createBranch, postman.syncCollections, specs.apply, codespaces.create/list, chat.sendMessage. Input schemas (Zod) defined in `packages/types`; output validated. Tools stored under `/mcp/servers/<provider>/` with per-tool JSON descriptors.
4. Security, Observability & Audit: Secrets required: GITHUB_APP_PRIVATE_KEY, GITHUB_APP_ID, CLOUDFLARE_API_TOKEN, NEON_API_KEY, POSTMAN_API_KEY, BETTERAUTH_SECRET, ONE_SIGNAL_KEY, POSTHOG_KEY, MASTER_ENC_KEY. Least privilege tokens; secret overview FR-023; encryption at rest for secrets metadata; JWT signing key rotation (90d) & audit events. Logging: structured JSON (requestId, traceId, actionType, resourceId, durationMs, outcome, code). Metrics: provisioning_duration_seconds, spec_apply_duration_seconds, env_dashboard_latency, circuit_breaker_open_total, retry_attempts, rate_limit_consumed_total, errors_total, key_rotation_total, preview_env_active_total. Tracing spans around integration calls & spec apply phases.
  - Rate limiting & circuit breaker observability: metrics per FR-033 & FR-032 plus health check outcomes drive SLO tracking & SC-008..SC-011 measurement.
5. Monorepo Simplicity & Reusable Primitives: Only mandated packages: ui, types, api-client, utils, config. No additional base packages proposed. Complexity table currently empty.

If any gate fails, STOP and revise the spec or propose an amendment.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (None active) | Constitution and plan fully aligned post Hono adoption & spec refinement | N/A |
| Added cross-cutting concerns (rate limiting & circuit breaker) | Protect upstream services, ensure fair usage & resilience aligned with SLO targets | Omitting adds outage amplification risk and fairness issues; naive retries risk thundering herd |
| Telemetry (metrics + tracing) beyond basic logging | Enables quantitative SC validation (latency, error rate, retry depth, circuit breaker efficacy), accelerates debugging & future optimization | Relying solely on logs increases MTTR, lacks distribution insight, hampers automated alerting & success criteria measurement |
| Encryption & key rotation (pgcrypto + JWT key cadence) | Reduces blast radius, prepares for compliance (SOC2 readiness), protects secret metadata at rest | Plaintext storage increases compromise impact; ad hoc rotation risks forgotten keys and audit gaps |

Affirmation: No current Constitution violations require justification; FR-020 duplication resolved; Express references corrected to Hono; all spec refinements (Session 2 2025-11-21) completed: schemas added (FR-023, FR-021 resource segments, FR-036 origin), success criteria clarified (SC-009, SC-011), configuration bounds defined (preview TTL, cap overflow handling, Postman naming, secret masking). All critical alignment issues resolved. Table retained for historical context of accepted complexity.
