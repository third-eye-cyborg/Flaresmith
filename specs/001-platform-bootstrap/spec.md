# Feature Specification: Platform Bootstrap

**Feature Branch**: `001-platform-bootstrap`  
**Created**: 2025-11-21  
**Status**: Draft  
**Input**: User blueprint describing Flaresmith orchestration platform (formerly CloudMake)

## Clarifications

### Session 2025-11-21

- Q: Express-to-Cloudflare deployment strategy (FR-028) - Deploy Express directly, use Workers-compatible framework (Hono/itty-router), run Express on Pages Functions, or hybrid approach? → A: Hono framework on Cloudflare Workers
- Q: Postman collection structure depth (FR-029) - Single collection with folders, multiple collections per domain, hybrid base + environment collections, or auto-generated per-endpoint? → A: Hybrid: Base collection + environment-specific collections (dev/staging/prod)
- Q: Entity ID format strategy - Auto-incrementing integers, UUIDs (v4), hybrid UUIDs for public/integers for internal, or NanoIDs/CUIDs? → A: UUIDs (v4) for all entities
- Q: Pagination strategy - Offset-based, cursor-based, hybrid offset/cursor, or page token-based? → A: Cursor-based pagination
- Q: WebSocket authentication mechanism - JWT in URL query parameter, Sec-WebSocket-Protocol header, initial message-based auth, or cookie-based? → A: JWT token in WebSocket connection URL query parameter
- Q: Environment lifecycle state model definition → A: Rich lifecycle: pending → provisioning → active → updating → validating → active; failure paths: error (recoverable) / failed (terminal) / archived; transitions: promotion & deploy occur during updating+validating; rollback enters updating(rollback) then validating; error can retry to provisioning or updating; failed requires manual reset prior to any transition.
- Q: Role-based authorization role model → A: Owner, Maintainer, Contributor, Viewer (four-tier granularity: project governance, operational management, spec/code contribution, read-only visibility).
- Q: Reliability & availability target → A: 99.5% monthly uptime SLO with warm standby Neon branch + automated health checks (30s interval, 3 consecutive failures trigger failover) and Cloudflare edge resilience; RTO < 5m, RPO < 1m (branch replication), error budget used to gate non-critical promotions.
- Q: External integration failure handling & retry strategy → A: Exponential backoff with full jitter (100ms base doubling up to 1600ms, max 5 attempts), per-integration circuit breaker opens after 10 failures in 60s, half-open probe after 30s, breaker state exposed in environment dashboard.
- Q: Rate limiting strategy scope → A: Token bucket per-user (60 tokens/min, burst 120) and per-project (300 tokens/min, burst 600) with global safety cap; classify endpoints: provisioning consumes 5 tokens, chat start 3, chat stream 1 per 10s, read-only 1; 429 includes Retry-After; buckets reset each minute.
- Q: Environment extensibility model → A: Core fixed trio (dev, staging, prod) PLUS ephemeral preview environments prefixed `preview-<branchSlug>` auto-created for feature branches; preview environments are non-promotable, may expire after inactivity (default TTL 72h), and excluded from SLO uptime calculations.
- Q: Error code taxonomy format → A: Hierarchical CATEGORY_SUBCATEGORY pattern (e.g., ENV_PREVIEW_EXPIRED, INTEGRATION_CLOUDFLARE_TIMEOUT, SPEC_DRIFT_CONFLICT, RATE_LIMIT_USER) with optional provider suffix; each code mapped to severity (info|warn|error|critical) and retryPolicy (none|safe|idempotent) to drive client + circuit breaker behavior.

### Session 2025-11-22

- Q: Error details envelope structure (fields included and exposure level) → A: Structured envelope exposing: code, message, severity, retryPolicy, requestId, timestamp, context (map of safe key-value), hint (human actionable guidance), causeChain[] (ordered ancestor codes), and details (schema-specific object); internal stack traces excluded from envelope (retained only in logs) for security.
- Q: Observability instrumentation approach (logs/metrics/tracing scope & propagation) → A: Full telemetry: structured JSON logs + OpenTelemetry metrics & tracing with W3C Trace Context propagation into outbound integration calls (GitHub/Neon/Postman/Cloudflare where headers/hooks permit); export via OTLP (batch) to external collector; include distributed context (traceparent,tracestate) on integration requests; sampling: parent-based 5% traces (errors forced sample); metrics: counters, gauges, histograms for provisioning latency, circuit breaker events, rate limit usage, retry attempts, environment state transitions.
- Q: Security posture strategy (secrets, token signing, rotation, encryption) → A: Managed secrets across Cloudflare (environment vars), Neon (role-based DB creds), and GitHub (Actions & Environment Secrets); JWT access tokens signed HS256 with rotating key (every 90d) + overlapping grace period 7d; refresh tokens 24h lifetime; environment secrets metadata encrypted at rest using pgcrypto (AES-GCM) with master key stored in Cloudflare secret; provider OAuth tokens stored encrypted + rotated per provider policy; no raw secrets in logs (FR-013); key rotation job emits audit event & updates JWKS-like manifest; GitHub environment vs workflow secrets both supported in mapping overview (FR-023).

## User Scenarios & Testing (mandatory)

### User Story 1 - Create Project (Priority: P1)
User creates a new project via web UI providing name + integrations (GitHub, Cloudflare, Neon, Postman). System provisions repo (template monorepo), initializes /specs + /mcp, sets up Codespace, environments, Neon branches, Cloudflare Workers/Pages, Postman workspace & collections.

**Why this priority**: Foundation for all subsequent management; no other features useful until a project exists.

**Independent Test**: Invoke backend API POST /projects with required payload and verify: repo exists, spec files created, dev Codespace running, environment records persisted.

**Acceptance Scenarios**:
1. Given integrations authorized, When user submits project form, Then system creates GitHub repo with expected structure and returns project record.
2. Given project creation succeeded, When querying GET /projects/{id}, Then response includes environment states and integration statuses.

---

### User Story 2 - Environment Dashboard (Priority: P2)
User views consolidated dashboard showing dev/staging/prod mapping across GitHub branches, Cloudflare URLs, Neon DB branches, Postman environments, latest build/deploy/test status.

**Why this priority**: Enables operational visibility and manual promotion actions.

**Independent Test**: With a project created, hitting GET /projects/{id}/environments returns matrix with fields populated; UI renders cards.

**Acceptance Scenarios**:
1. Given a project with resources provisioned, When dashboard loads, Then all envs display URLs, branch names, DB branch, last deployment timestamp.
2. Given a successful promotion, When dashboard refreshes, Then staging reflects new commit hash or deployment ID.

---

### User Story 3 - Spec-Driven Update & Sync (Priority: P3)
User edits specs (e.g., adds new API endpoint definition) and triggers sync. System updates Zod schemas, Drizzle models, Hono routes, Postman collection, MCP tool descriptors accordingly.

**Why this priority**: Ensures spec-first development loop and automation.

**Independent Test**: Modify spec file adding endpoint definition; call POST /specs/apply; verify code + collection + MCP tool file created/updated.

**Acceptance Scenarios**:
1. Given a new endpoint spec, When apply is triggered, Then OpenAPI path, Hono route stub, Zod schema, Postman request appear.
2. Given outdated schema, When apply runs, Then drift report indicates differences and resolves with updates.

---

### User Story 4 - Chat & Code Editor Integration (Priority: P4)
User opens in-browser CodeMirror file explorer and chat panel; AI (Copilot CLI wrapper) proposes edits referencing spec + MCP tools; user applies diff which commits to feature branch.

**Why this priority**: Enables AI-first workflow and remote lightweight edits.

**Independent Test**: Start chat session, submit prompt, receive response with proposed edits; apply edits triggers backend commit and returns commit SHA.

**Acceptance Scenarios**:
1. Given existing project, When user opens editor, Then file tree loads via GitHub API.
2. Given chat prompt referencing spec, When AI responds, Then diff preview rendered and can be applied.

### Edge Cases
- Project creation with partial integration authorization (e.g., GitHub authorized, Cloudflare missing).
- Retry of idempotent provisioning when repo already exists (idempotency keys enforce convergence; returns existing resource identifiers instead of error).
- Spec apply when generated code has local uncommitted manual changes: drift detector marks conflicts[] entries with reason `UNCOMMITTED_LOCAL_CHANGES`; no overwrite occurs. User must either commit or discard local changes before re-running apply. Resolution flow:
	1. Detect uncommitted modifications vs expected generated file signature.
	2. Add conflict entry: `{ path, reason: 'UNCOMMITTED_LOCAL_CHANGES' }`.
	3. Return 409 if auto-apply requested; allow dry-run mode to preview.
	4. After user commits/discards, re-run apply to proceed.
- Chat proposing conflicting file edits concurrently: optimistic locking via base commit SHA; if HEAD changed since diff creation, server returns conflict error requiring re-fetch and re-apply.
- Circuit breaker open for external provider: environment dashboard surfaces breaker state; promotion/deploy actions short‑circuit with actionable error.
- Rate limit exceeded: endpoint returns 429 with `Retry-After` seconds and headers `X-RateLimit-Remaining-User`, `X-RateLimit-Remaining-Project`.
- Expired preview environment access: requests to a `preview-*` environment past TTL return 404 with error code `ENV_PREVIEW_EXPIRED` and suggest recreation via branch activity.
- Integration provider persistent outage: after circuit breaker opens, subsequent calls return 503 with `INTEGRATION_<PROVIDER>_UNAVAILABLE` (severity=error, retryPolicy=none) until half-open probe succeeds.

## Requirements (mandatory)

### Functional Requirements
- FR-001: System MUST create GitHub repo from monorepo template.
- FR-002: System MUST initialize /specs and seed architecture & constitution documents.
- FR-003: System MUST provision dev Codespace and return preview URLs.
- FR-004: System MUST create Neon project + dev/staging/prod branches.
- FR-005: System MUST create Cloudflare Workers/Pages for dev/staging/prod.
- FR-006: System MUST create Postman workspace + base collection and environments.
- FR-007: System MUST expose environment matrix via GET /projects/{id}/environments (response schema defined in `contracts/openapi.yaml` path `/projects/{id}/environments`).
- FR-008: System MUST support promotion actions (dev→staging, staging→prod).
- FR-009: System MUST parse spec changes and regenerate schemas/routes/tools.
- FR-010: System MUST validate regenerated artifacts via Zod + drift detection and return a standardized drift report object:
	DriftReport schema:
	```json
	{
		"changedFiles": [
			{ "path": "string", "type": "added|modified|removed", "diffSummary": "string" }
		],
		"conflicts": [
			{ "path": "string", "reason": "UNCOMMITTED_LOCAL_CHANGES|MANUAL_DIVERGENCE|SCHEMA_MISMATCH", "suggestion": "string" }
		],
		"summary": {
			"changedCount": "number",
			"conflictCount": "number",
			"status": "clean|drift|conflicts"
		}
	}
	```
	- `status=conflicts` MUST trigger HTTP 409 for auto-apply requests.
	- Conflicts MUST NOT overwrite existing files; user resolves then re-runs apply.
- FR-011: System MUST provide WebSocket/streaming chat endpoint wrapping Copilot CLI with JWT-based authentication via URL query parameter (wss://api/chat?token=jwt) for universal client compatibility.
- FR-012: System MUST surface file diffs and enable commit via backend.
- FR-013: System MUST enforce security (no secrets in logs) and audit provisioning actions.
- FR-014: System MUST maintain MCP tool descriptors synchronized with integrations.
- FR-015: System MUST run Postman tests in CI before promotion.
- FR-016: System MUST support rollback of deployments where provider supports it.
- FR-017: System MUST implement structured logging with correlation IDs.
- FR-018: System MUST provide OpenAPI spec endpoint.
- FR-019: System MUST guard chat actions with spec-first context injection.
- FR-020: System MUST implement role-based authorization (BetterAuth) for project operations using defined roles: Owner, Maintainer, Contributor, Viewer.
- FR-021: System MUST return deterministic idempotency keys on repeat provisioning calls using pattern `<projectId>-<resource>-<environment>` (e.g., `123e4567-project-githubRepo-dev`). Keys MUST be logged once and reused to converge retries. Recognized resource segments: `githubRepo`, `githubCodespace`, `neonProject`, `neonBranch`, `cloudflareWorker`, `cloudflarePage`, `postmanWorkspace`, `postmanCollection`. Collision handling: If key exists, return existing resource identifier without error.
- FR-022: System MUST support partial integration update (later adding Cloudflare after initial project creation).
- FR-023: System MUST generate environment secrets mapping overview. Response schema:
	```json
	{
		"secrets": [
			{
				"secretRefHash": "sha256:a1b2c3...",
				"name": "GITHUB_TOKEN",
				"type": "githubActionSecret|githubEnvironmentSecret|cloudflareBinding|neonCredential",
				"environment": "dev|staging|prod|all",
				"maskedValue": "ghp_****",
				"lastRotatedAt": "2025-11-21T10:00:00Z",
				"expiresAt": "2026-02-21T10:00:00Z"
			}
		]
	}
	```
	Masking pattern: Fixed 8-character prefix for tokens (`ghp_****`, `neon_****`); constant `****` for other secrets. Viewer role receives masked values only; Maintainer/Owner see last 4 characters.
- FR-024: System MUST store and expose deployment history.
- FR-025: System MUST support cursor-based pagination for list endpoints. Request: `GET /projects?cursor=<opaque>&limit=<n>`; Response example:
	```json
	{ "items": [{"id":"uuid","name":"string"}], "nextCursor": "opaque-or-null", "hasMore": true }
	```
	Cursors MUST be opaque (Base64 or hashed) and MUST NOT expose raw sequential IDs.
- FR-026: System MUST support branch-based dev preview endpoints; preview environment URLs follow pattern `https://preview-<branchSlug>.<projectId>.pages.dev` (example: `https://preview-feature-x.123e4567.pages.dev`). Preview environments are excluded from promotion chain and uptime SLO metrics.
- FR-027: System MUST support spec versioning and referencing Constitution version.
- FR-028: System MUST use Hono framework deployed on Cloudflare Workers for API backend (edge-native, instant cold starts, no Express adapter needed).
- FR-029: System MUST organize Postman collections as hybrid structure: base collection containing all endpoints + environment-specific collections (dev/staging/prod) with environment variables and pre-configured requests. Naming convention: base collection named `CloudMake Base - <ProjectName>`; environment collections named `CloudMake - <ProjectName> (dev|staging|prod)`. Folder hierarchy: base collection organized by domain (Projects, Environments, Specs, Chat); environment collections inherit base structure with environment-scoped variables pre-populated.
- FR-030: System MUST implement CodeMirror lazy loading for large files: fetch blob size first, use GitHub API range requests for files >1MB, cap editing to <2MB initially (per research.md D-003).
- FR-031: System MUST implement automated health checks (API ping + Neon connectivity) every 30s and route failover to warm standby DB branch after 3 consecutive failures, recording an incident event.
- FR-032: System MUST implement exponential backoff with full jitter for transient external integration failures (attempts at ~100ms,200ms,400ms,800ms,1600ms) and a circuit breaker per integration: open after ≥10 failures within 60s, half-open after 30s, close on success; breaker state & failure counts surfaced via GET /projects/{id}/environments.
- FR-033: System MUST enforce token bucket rate limiting: per-user bucket (capacity 120, refill 60/min) and per-project bucket (capacity 600, refill 300/min); provisioning endpoints consume 5 tokens, chat session initiation 3, streaming sustain 1 per 10s server-enforced heartbeat, standard reads 1. 429 responses MUST include headers:
	- `Retry-After`
	- `X-RateLimit-Remaining-User`
	- `X-RateLimit-Remaining-Project`
	- `X-RateLimit-Limit-User`
	- `X-RateLimit-Limit-Project`
	Rate limit check overhead p95 < 5ms (SC-010). Streaming token consumption occurs every 10s while connection active.
- FR-034: System MUST support ephemeral preview environments named `preview-<branchSlug>` with automatic creation on first preview request and automated archival after inactivity TTL (default 72h, configurable per project via `previewTtlHours` setting, min 24h, max 168h [7 days]). Configuration surface: project settings API (`PATCH /projects/{id}`) and environment variable `CM_PREVIEW_TTL_HOURS` (global default). Preview environments excluded from promotion actions and uptime SLO metrics.
- FR-035: System MUST implement full telemetry instrumentation (structured logs, metrics catalog, tracing spans, W3C Trace Context propagation, sampling policy, OTLP export with resilient backoff) per Observability & Telemetry section.
- FR-036: System MUST implement managed secrets & key rotation: encrypted secrets metadata (pgcrypto), JWT signing key rotation every 90 days with 7-day grace (old key purged after grace + 1d buffer), annual master encryption key rotation, audited secret access operations. Secret audit record schema:
	```json
	{
		"id": "uuid",
		"actorId": "uuid",
		"origin": "user|system",
		"secretRefHash": "string",
		"operation": "read|update|rotate",
		"timestamp": "RFC3339"
	}
	```
	Audit events MUST exclude raw secret values. `origin=system` for automated rotation jobs; `origin=user` for manual actions.
### Key Entities
- Project, Environment, IntegrationConfig, Deployment, Build, User, Organization, SpecArtifact, MCPToolDescriptor, ChatSession, Codespace, Repo.
- All entity IDs MUST use UUID v4 format for security (non-enumerable), distributed generation capability, and Postgres UUID type compatibility.
- Environment State Lifecycle:
	- States: pending, provisioning, active, updating, validating, error, failed, archived.
	- Primary transitions:
		- pending -> provisioning -> active
		- active -> updating (deploy / promote / rollback)
		- updating -> validating -> active (success) | error (failure)
		- error -> updating (retry deploy) | provisioning (recreate) | failed (exhausted retries)
		- failed -> archived (manual retire) | provisioning (manual reset)
		- active -> archived (retire environment)
	- Rollback uses updating (rollback) → validating → active.
	- All environment API responses MUST include a state field; UI badges reflect transitional states (provisioning, updating, validating) and disable destructive actions while not in active/error.
	- Preview environments: kind=preview; limited states (provisioning|active|error|archived); not eligible for updating→validating promotion cycle; deletion/archival triggered by TTL job.

### Roles & Authorization
Defined roles and core permissions (referenced by FR-020):
| Role | Core Permissions |
|------|------------------|
| Owner | Full access: project deletion, role assignment, all provisioning, promotions, rollbacks, secret management, audit log access |
| Maintainer | Manage environments (deploy/promote/rollback), update integrations, trigger spec apply, view secrets (masked), cannot delete project or alter Owner roles |
| Contributor | Edit specs, trigger spec apply, propose code/chat diffs, create non-prod deployments, cannot modify integrations or production promotions |
| Viewer | Read-only: list projects, view environments matrix, deployment history, specs, audit summaries |

Access control enforcement notes:
* Promotion actions require Maintainer or above.
* Production rollback requires Maintainer or Owner.
* Project deletion restricted to Owner.
* Secret overview (FR-023) exposes masked values to Maintainer/Owner only.
* Chat diff commit (FR-012) requires Contributor or above.

### Error Model

All error responses MUST use a consistent JSON envelope:

```
{
	"error": {
		"code": "ENV_PREVIEW_EXPIRED",        // Hierarchical code taxonomy (Clarifications Session 2025-11-21)
		"message": "Preview environment has expired.",
		"severity": "error",                  // info | warn | error | critical
		"retryPolicy": "none",                // none | safe | idempotent (client may auto-retry safe/idempotent)
		"requestId": "b12f...",               // Correlates with structured logging (FR-017)
		"timestamp": "2025-11-22T10:15:30Z",  // RFC 3339
		"context": {                           // Safe diagnostic key/value pairs (no secrets)
			"environmentId": "...",
			"branch": "feature-x"
		},
		"hint": "Push a new commit to recreate the preview.",
		"causeChain": ["ENV_PREVIEW_TTL_EXPIRED"], // Ordered ancestor/underlying codes (outermost first)
		"details": {                            // Schema-specific structured object (shape per code family)
			"expiryHours": 72
		}
	}
}
```

Rules:
* Stack traces & provider raw payloads are NOT exposed; they remain only in logs.
* `severity` + `retryPolicy` drive client UX (e.g., show retry button for safe/idempotent).
* `causeChain` MUST list unique codes without duplication.
* `context` MUST be filtered to exclude secrets/tokens; keys are lowerCamelCase.
* `details` MUST have a documented schema per top-level `code` family (e.g., ENV_*, INTEGRATION_*). If no extra data, omit `details`.
* 429 (rate limit) responses MUST still use envelope; include remaining tokens in headers per FR-033.
* Circuit breaker open errors use `INTEGRATION_<PROVIDER>_UNAVAILABLE` with `severity=error` and `retryPolicy=none`.
* Preview expiry uses `ENV_PREVIEW_EXPIRED` (`severity=error`, `retryPolicy=none`).
* Idempotent transient failures (e.g., Neon branch create race) use `INTEGRATION_NEON_CONFLICT` with `retryPolicy=idempotent`.

Observability Tie-In:
* Every error log line MUST include `requestId`, `code`, `severity`.
* Metrics: counter `errors_total{code,severity}` increments; histogram `retry_attempts{code}` tracks retry depth.
* Traces: span status code maps severity error→set status.Error.
* Export pipeline: OTLP HTTP/gRPC batch export (flush every 5s or on span end if critical), resilient with backoff (FR-032 rules) when collector unreachable.
* Sampling: 5% parent-based probability for successful requests; all requests with severity=error|critical are force-sampled; long provisioning operations (>2s) auto-upgrade to sampled.
* Propagation: Include `traceparent` and `tracestate` headers on outbound integration calls (providers ignoring headers are tolerated without failure). If provider returns correlation ID, map it into span attributes `integration.correlation_id`.
* Metrics Catalog (initial):
	- `provision_duration_seconds` (histogram, by provider, environmentKind)
	- `deployment_duration_seconds` (histogram, environmentKind)
	- `environment_state_transitions_total{from,to}` (counter)
	- `circuit_breaker_open_total{provider}` (counter)
	- `circuit_breaker_half_open_total{provider}` (counter)
	- `rate_limit_consumed_total{scope=project|user,endpointClass}` (counter)
	- `rate_limit_remaining{scope}` (gauge derived from internal state)
	- `retry_attempts{provider,operation}` (histogram) – aligns with backoff policy
	- `preview_env_active_total` (gauge)
	- `errors_total{code,severity}` (counter)
	- `chat_latency_seconds` (histogram, streaming setup + first token)
	- `spec_apply_duration_seconds` (histogram)
* Log Fields (base): timestamp, level, requestId, traceId, spanId, userId (if authenticated), projectId (if scoped), code (for errors), environmentId, durationMs, integrationProvider (if applicable).
* PII/Sensitive Filtering: user email or tokens MUST NOT appear; secrets masked at source (FR-013); context map scrub passes before emission.
* Alerting Inputs: errors_total (critical severity), circuit_breaker_open_total, provisioning_duration_seconds p95 > threshold, uptime derived from health check metrics.

### Observability & Telemetry

Instrumentation Strategy:
* Logging: Structured JSON to stdout/Workers console; aggregated by external collector; severity levels mapped to info|warn|error|critical.
* Tracing: OpenTelemetry SDK for Workers (lightweight) creating root span per incoming request; child spans for integration calls, DB operations, spec apply phases, chat streaming negotiation.
* Metrics: OpenTelemetry metrics API (stable subset) with periodic export; fallback in-memory ring buffer when collector unreachable (drops oldest).
* Context Propagation: Conform to W3C Trace Context; internal async tasks (promotions, TTL archive job) continue trace with `spanKind=internal`.
* Sampling Policy: configurable base sample rate (default 5%), error & long-running operations (latency >2s) always sampled.
* Redaction: Logger enforces denylist patterns for secret-like substrings (e.g., `AKIA[0-9A-Z]{16}`) replacing with `***`.
* Correlation: `requestId` generated at ingress (UUID v4); traceId distinct; both returned in error envelope.
* Success Criteria Mapping: SC-001..SC-010 measured via respective histograms/counters (see Metrics Catalog) enabling dashboard & alerting.

### Security & Secrets Management

Security Principles:
* Least privilege integration credentials (GitHub PAT scope limited to repo + workflow; Neon branch roles; Cloudflare API token minimal scopes).
* Secrets NEVER logged (enforced by redaction & denylist scanning, FR-013).
* Central secret stores: Cloudflare Workers secrets (runtime), GitHub Actions & Environment Secrets (deployment workflows), Neon connection strings. Mapping surfaced by FR-023 with masking.
* Encryption At Rest: `environment_secrets` metadata table fields (valueHash, lastRotatedAt) plus provider tokens encrypted via pgcrypto AES-GCM; master key from Cloudflare secret (`CM_ENC_MASTER_V1`), rotated annually (audit event).
* JWT Auth: HS256 access tokens (short-lived ≤15m), refresh tokens 24h; signing key rotated every 90d; previous key retained for 7d grace to honor existing tokens; JWKS-style manifest endpoint enumerates active + expiring keys (kid-based selection).
* Key Rotation Process: scheduled job generates new key, updates manifest, triggers audit log entry, sends metric `key_rotation_total`.
* GitHub Secrets: Support both repository-level Action secrets and Environment secrets; environment secrets preferred for env-specific credentials (e.g., staging Cloudflare token). Overview differentiates type: `githubActionSecret` vs `githubEnvironmentSecret`.
* Provider OAuth Tokens: stored encrypted, refresh flow uses safe retryPolicy=idempotent; failure emits `INTEGRATION_<PROVIDER>_TOKEN_REFRESH_FAILED` (severity=error).
* Secret Diff Prevention: drift detector flags plaintext additions in spec changes referencing secret names (must map to masked entries).
* Auditing: All secret read/write/rotate operations recorded with `SEC_SECRET_ACCESS` code containing actorId, secretRef (hashed), operation (read|update|rotate), timestamp.
* Compliance Prep: Field-level encryption & rotation cadence documented for future SOC2 controls; no PII beyond user email (not stored in logs).
* Incident Response: Compromise scenario triggers immediate invalidation of current signing key (revocation list) and forced refresh on next request; metric `emergency_key_invalidations_total` increments.

## Success Criteria (mandatory)

### Measurable Outcomes
- SC-001: New project full provisioning < 90 seconds p95.
- SC-002: Environment dashboard response time < 500ms p95 (excluding external API latency spikes).
- SC-003: Spec apply regeneration completes < 30 seconds for baseline template.
- SC-004: 95% of provisioning retries converge without manual intervention.
- SC-005: Postman test suite passes with 0 critical failures before promotion.
- SC-006: Chat diff application round-trip < 5 seconds for <10 file edits.
- SC-007: Zero secrets detected in logs (automated scan weekly).
- SC-008: Monthly uptime ≥ 99.5% (unplanned downtime ≤ ~219m); RTO < 5 minutes for DB/API failover, RPO < 1 minute; incident metrics and error budget tracked.
- SC-009: Circuit breaker effectiveness: ≥90% reduction in repeated failing calls during upstream outage (baseline: error attempts in first 60s pre-open vs next 60s while open) and breaker open duration < 15 minutes p95.
- SC-010: Rate limit consistency: <1% of legitimate user requests receive 429 under normal load at p95; provisioning endpoints average successful first-attempt rate ≥98%; token bucket latency overhead <5ms p95.
- SC-011: Key rotation compliance: signing key rotated ≤ 92 days p95; zero tokens rejected due to missing grace window; secret audit log accuracy ≥99% (denominator: total successful secret read/update/rotate operations recorded in audit table vs operations counted by metrics `secret_access_total`).

## Data Scale & Limits

Initial operational scale assumptions (not hard caps, inform sizing & early optimizations):
* Projects: ~100 active (design target); Entities sized for ≥10x growth without schema change.
* Stable Environments (dev/staging/prod): 3 per project.
* Preview Environments: ≤15 concurrently active per project (hard cap enforced at creation). Overflow handling: when 15th preview exists, creation request for 16th returns 409 with error code `ENV_PREVIEW_LIMIT_REACHED` (severity=error, retryPolicy=none, hint: "Archive an existing preview or wait for TTL expiry"). Archival job: runs hourly, archives previews past TTL; manual archive via `DELETE /projects/{id}/environments/{envId}` available to Maintainer+.
* Chat Sessions: ≤10 active per project concurrently (soft limit for resource conservation).
* API Throughput: Designed for p95 latency <300ms under 50 req/s aggregate (burst tolerance via Cloudflare scaling) and sub-linear overhead for rate limit checks (<5ms p95).
* Telemetry Volume: Target <10KB avg log payload per request; metrics export batch every ≤5s; trace sampling base 5%.
* Storage Growth: Neon DB row growth dominated by deployment history & logs pointer tables; expected <5M rows first year; partitioning not required initially.

## Out-of-Scope (Explicit)

The following are intentionally deferred or excluded from this feature scope:
* Multi-region active/active failover (warm standby only within single region; no global traffic manager).
* Hardware-backed KMS/HSM integration (software-managed encryption key only; future upgrade path documented).
* JWE encrypted access tokens (HS256 compact JWT sufficient for current risk profile).
* Automated GDPR/CCPA data erasure workflows (manual deletion only; future feature).
* Advanced bulk data export/import pipelines (limited to spec/apply & API pagination).
* Real-time collaborative spec editing (single-user apply flow with optimistic locking only).
* AI model fine-tuning or vector embedding store (chat relies on context injection + MCP tools).
* Full-blown chaos engineering (baseline health checks + circuit breaker only).

## Future Clarifications (Backlog)

Potential follow-up clarification targets (not blocking current implementation):
1. Maximum preview environment archival batch size & scheduling cadence tuning.
2. Multi-region expansion strategy (data replication & latency target adjustments).
3. GDPR deletion workflow acceptance criteria & audit log redaction policy.
4. Bulk export schema (project/environment snapshot format) & import safety checks.
5. Advanced drift resolution automation (auto-merge heuristics for low-risk conflicts).
6. Fine-grained metrics retention & sampling adjustment policy (cost vs fidelity).
7. SLO error budget policy elaboration (deployment freeze triggers & thresholds).
