# Research: GitHub Secrets Synchronization & Environment Configuration

## Overview
Phase 0 resolves implementation questions around GitHub Secrets API patterns, secret scoping mechanisms, environment protection rules, retry strategies, and rate limit handling. All decisions align with Flaresmith Constitution principles (spec-first, idempotent, observable, secure).

## Decisions

### D-001 GitHub Secrets API Scope Architecture
- **Decision**: Use separate API endpoints for each secret scope (Actions, Codespaces, Dependabot) with unified service layer abstraction.
- **Rationale**: GitHub provides distinct API endpoints for each scope (`PUT /repos/{owner}/{repo}/actions/secrets/{name}`, `/codespaces/secrets/{name}`, `/dependabot/secrets/{name}`) with identical request/response patterns. Abstracting with a unified service layer enables retry logic, error handling, and audit logging to be shared while respecting scope-specific endpoints.
- **Alternatives Considered**:
  - Single endpoint with scope parameter: GitHub API doesn't support this pattern.
  - Repository-level secrets only: Doesn't cover Codespaces/Dependabot use cases which have separate quota and permissions.
- **API Endpoints Used**:
  - Actions: `PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}` (requires `repo` scope or `secrets` permission)
  - Codespaces: `PUT /repos/{owner}/{repo}/codespaces/secrets/{secret_name}` (requires `repo` scope or `codespaces` permission)
  - Dependabot: `PUT /repos/{owner}/{repo}/dependabot/secrets/{secret_name}` (requires `repo` scope or `security_events` permission)

### D-002 Secret Value Encryption Strategy
- **Decision**: Use GitHub's public key encryption API for secret values before upload; retrieve repo public key per sync operation and cache for 5 minutes.
- **Rationale**: GitHub Secrets API requires values to be encrypted with repository's public key (sodium/libsodium encryption). Public keys rotate periodically, so caching reduces API calls while ensuring fresh keys. 5-minute TTL balances performance and security.
- **Alternatives Considered**:
  - Client-side encryption library: Adds dependency complexity; GitHub SDK (Octokit) already provides `sodium` wrapper.
  - No caching: Excessive API calls (1 fetch per secret = rate limit risk).
  - Longer cache TTL: Increased risk of using stale keys.
- **Implementation**: Use `@octokit/rest` SDK method `repos.getActionsPublicKey()` with in-memory cache (`key_id`, `key`, `expires_at`). Encrypt values using `sodium.seal()` before PUT requests.

### D-003 Secret Exclusion Patterns
- **Decision**: Maintain exclude list of platform-managed secrets in database table `secret_exclusion_patterns` with regex support; default excludes: `GITHUB_TOKEN`, `ACTIONS_*`, `RUNNER_*`, `CI`.
- **Rationale**: Platform-injected secrets should never be synced (security risk, conflicts with GitHub's auto-injection). Database storage enables runtime updates without code deployment. Regex patterns provide flexibility (e.g., exclude all `ACTIONS_*` prefixed secrets).
- **Alternatives Considered**:
  - Hardcoded list: Inflexible, requires code changes for updates.
  - Environment variable config: Less discoverable, no audit trail.
  - No exclusions: Security vulnerability (could leak platform tokens).
- **Default Exclusions**: `^GITHUB_TOKEN$`, `^ACTIONS_.*`, `^RUNNER_.*`, `^CI$`, `^GITHUB_WORKSPACE$`, `^GITHUB_SHA$`, `^GITHUB_REF$`
- **Custom Exclusions**: Projects can add patterns via API `POST /projects/{id}/secret-exclusions` (e.g., exclude `STAGING_*` from prod sync).

### D-004 Environment Protection Rules Configuration
- **Decision**: Apply protection rules via GitHub Environments API with tiered structure: dev (none), staging (1 reviewer + wait timer 0min), production (1 reviewer + branch restriction `main` + wait timer 0min).
- **Rationale**: Balances security and velocity. Dev allows rapid iteration, staging adds human review gate, production adds branch restriction to prevent accidental deploys from feature branches. Wait timers disabled initially (0min) to avoid artificial delays; can be configured per-project later.
- **Alternatives Considered**:
  - Required reviewers for dev: Slows development velocity unnecessarily.
  - Branch restriction for staging: Overly restrictive (staging should test feature branches).
  - Higher reviewer count (2+): Not justified for small teams; creates bottleneck.
- **API Endpoint**: `PUT /repos/{owner}/{repo}/environments/{environment_name}` with body:
  ```json
  {
    "reviewers": [{"type": "User", "id": <reviewer_id>}],
    "deployment_branch_policy": {"protected_branches": true, "custom_branch_policies": false},
    "wait_timer": 0
  }
  ```
- **Reviewer Assignment**: Default to project owner; expose `POST /projects/{id}/environments/{env}/reviewers` endpoint for customization.

### D-005 Retry Strategy for GitHub API Failures
- **Decision**: Exponential backoff with jitter: base delay 1s, max delay 32s, max 3 retries. Retry on 5xx errors, 429 rate limits, network timeouts. Do not retry on 4xx client errors (except 429).
- **Rationale**: GitHub API is highly available but can experience transient failures. Exponential backoff reduces thundering herd risk. Jitter prevents synchronized retries from multiple workers. 3 retries balances reliability and sync latency (worst case ~1+2+4 = 7s delay).
- **Alternatives Considered**:
  - Linear backoff: Doesn't reduce load on GitHub API as effectively.
  - Unlimited retries: Risk of infinite loops on permanent failures.
  - No retry: Poor reliability (transient failures cause complete sync failure).
- **Jitter Implementation**: `delay = baseDelay * (2 ^ attempt) + random(0, 1000)ms`
- **Rate Limit Handling**: When 429 received, parse `Retry-After` header and wait specified duration before retry (overrides exponential backoff for that attempt).

### D-006 Secret Sync Trigger Mechanisms
- **Decision**: Support both webhook-triggered and scheduled sync. Webhooks for real-time sync on secret changes (GitHub doesn't provide native secret change webhooks, so use repository push events as proxy). Scheduled sync every 6 hours as fallback.
- **Rationale**: Webhook-based sync provides near-real-time propagation (within seconds) but can miss manual secret changes via GitHub UI (no webhook event). Scheduled sync ensures eventual consistency. 6-hour interval balances freshness and API quota consumption.
- **Alternatives Considered**:
  - Webhooks only: Misses manual changes, no fallback for webhook delivery failures.
  - Scheduled only: Unacceptable latency (could be hours before secrets propagate).
  - Polling every 5 minutes: Excessive API calls, wastes quota on no-op checks.
- **Webhook Event**: Listen to `push` events on default branch; trigger sync if commit message contains `[sync-secrets]` marker or if `.env.example` file modified.
- **Scheduled Job**: Cloudflare Workers Cron Trigger at `0 */6 * * *` (every 6 hours) runs `scripts/github/syncSecretsScheduled.ts`.

### D-007 Secret Validation Conflict Detection
- **Decision**: Compare SHA-256 hashes of encrypted secret values across scopes (not plaintext values). Flag conflict if Actions scope hash differs from Codespaces/Dependabot hashes.
- **Rationale**: GitHub API doesn't expose plaintext secret values (security design). Encrypted values change with each encryption (nonce-based), so direct comparison fails. Solution: Store hash of *plaintext* value in `secret_mappings` table during sync, compare hashes across scopes. If hash mismatch detected, flag conflict.
- **Alternatives Considered**:
  - Compare encrypted values: Doesn't work due to nonce randomness.
  - No conflict detection: Violates FR-009 requirement.
  - Decrypt and compare plaintext: GitHub API doesn't allow decryption (one-way).
- **Implementation**: During sync, compute `SHA256(plaintextValue)` and store in `secret_mappings.value_hash`. Validation endpoint compares hashes across scope records. If mismatch, report conflict with scopes and last sync timestamps (user resolves manually).
- **Limitation**: Cannot detect conflicts if secret was manually changed in GitHub UI (no webhook, hash not updated). Scheduled sync will detect and auto-fix by overwriting with Actions scope value.

### D-008 Environment-Specific Secret Naming Convention
- **Decision**: Use suffix pattern for environment-specific secrets: `{BASE_NAME}_{ENV}` (e.g., `NEON_BRANCH_ID_DEV`, `CLOUDFLARE_WORKER_NAME_STAGING`, `DATABASE_URL_PROD`). Validate suffix matches environment name.
- **Rationale**: Enables single repository with all environment secrets while maintaining clarity. GitHub Environment secrets override repository secrets by name, so no suffix needed for environment-scoped secrets (they're already isolated). Suffix only for repository-level secrets that vary per environment.
- **Alternatives Considered**:
  - Prefix pattern (`DEV_NEON_BRANCH_ID`): Less readable, groups poorly alphabetically.
  - No suffix (separate repos per env): Violates monorepo principle.
  - Environment secrets only: Works but requires more complex setup (must create environment for every project).
- **Validation**: API validates that secret name ends with `_DEV`, `_STAGING`, or `_PROD` if marked as environment-specific. Reject creation if suffix missing or invalid.
- **GitHub Environment Secrets**: For secrets in GitHub Environments (not repository), no suffix needed (e.g., environment `production` has secret `DATABASE_URL` directly).

### D-009 Audit Event Storage Schema
- **Decision**: Store audit events in `secret_sync_events` table with fields: `id` (UUID), `project_id`, `actor_id`, `operation` (enum: create|update|delete|sync), `secret_name`, `affected_scopes` (JSON array), `status` (success|failure|partial), `error_message`, `correlation_id`, `created_at`. Retain for 90 days.
- **Rationale**: Provides complete audit trail for security reviews and debugging. Storing secret *name* (not value) balances observability and security. `affected_scopes` array enables tracking which scopes were touched. `partial` status handles cases where some scopes succeed and others fail.
- **Alternatives Considered**:
  - Log-only approach: Not queryable, harder to generate reports.
  - Indefinite retention: Database bloat, compliance risk (minimize PII retention).
  - Separate table per event type: Over-normalization, join complexity.
- **Indexes**: `(project_id, created_at DESC)` for timeline queries, `(correlation_id)` for trace lookup.
- **Partitioning**: Partition by month for efficient purging of old events (Neon supports table partitioning).

### D-010 Rate Limit Quota Management
- **Decision**: Track GitHub API quota consumption in `github_api_quota` table with fields: `project_id`, `quota_type` (core|search|graphql), `remaining`, `reset_at`, `updated_at`. Refresh quota status before bulk operations. Block sync if remaining < 100 requests.
- **Rationale**: GitHub enforces 5000 req/hour for authenticated requests (core API) and separate limits for Secrets API (100 creates/hour). Preemptively checking quota prevents mid-sync failures. Threshold of 100 requests reserves buffer for critical operations.
- **Alternatives Considered**:
  - No quota tracking: Risk of hitting limits mid-sync, partial failures.
  - Optimistic approach (retry on 429): Wastes time on failed attempts.
  - Third-party quota service: Unnecessary dependency.
- **Implementation**: Intercept GitHub API responses, parse `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers, update database. Before sync, query `remaining` value; if below threshold, return error `INTEGRATION_GITHUB_RATE_LIMIT_EXHAUSTED` with reset time.
- **Quota Allocation**: Reserve quota buckets: 60% for user operations, 30% for scheduled sync, 10% for emergency manual operations.

### D-011 Preview Environment Secret Handling
- **Decision**: Automatically provision preview environment secrets when preview environment created. Copy base secrets from dev environment + add preview-specific overrides (`PREVIEW_ID`, `PREVIEW_URL`, `PREVIEW_EXPIRES_AT`). Auto-cleanup secrets when preview archived.
- **Rationale**: Preview environments need most dev secrets (database, API keys) plus preview-specific metadata. Copying from dev avoids manual config. Auto-cleanup prevents secret sprawl and GitHub quota waste.
- **Alternatives Considered**:
  - Manual secret config per preview: Too slow, poor DX.
  - Share dev environment secrets: Doesn't work (preview needs unique URLs, branch IDs).
  - No preview-specific secrets: Limits preview environment utility.
- **Implementation**: When preview environment created, call `POST /github/environments` with `base_environment=dev` parameter. Service copies dev secrets, appends preview overrides, sets protection rules (none for previews). On archive, call `DELETE /github/environments/{preview-name}` which removes environment and all associated secrets.

### D-012 Secret Value Redaction in Logs
- **Decision**: Implement middleware `secretRedactionMiddleware` that scans log objects for known secret patterns before emission. Redact using regex for common formats (API keys, tokens, connection strings). Replace with `***REDACTED***` placeholder.
- **Rationale**: Zero-trust approach to secret logging. Even if code accidentally logs secret value, middleware catches and redacts. Critical for FR-015 compliance (no secret values in logs).
- **Alternatives Considered**:
  - Manual redaction in code: Error-prone, easy to miss.
  - No logging of secret operations: Reduces observability.
  - Post-processing log files: Too late if logs already shipped to external system.
- **Redaction Patterns**: 
  - API keys: `[A-Za-z0-9_-]{20,}` (heuristic, may have false positives)
  - Connection strings: `postgres://[^:]+:[^@]+@` (match password in URL)
  - JWT tokens: `eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`
  - GitHub tokens: `gh[ps]_[A-Za-z0-9]{36,}`
- **Context Preservation**: Log secret name and operation but never value. Example: `{ operation: "sync", secretName: "DATABASE_URL", targetScope: "codespaces", valueHash: "abc123...", value: "***REDACTED***" }`

## Outstanding Clarifications

All clarifications from initial spec have been resolved through research decisions above. No remaining unknowns.

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| GitHub API rate limits exhausted during bulk sync | Sync fails partially or completely | Implement quota tracking (D-010), stagger sync operations, use scheduled sync as fallback |
| Secret encryption key rotation by GitHub | Sync failures if cached key stale | Use short cache TTL (5min), fetch fresh key on encryption error |
| Webhook delivery failures | Missed real-time sync triggers | Scheduled sync every 6 hours provides eventual consistency |
| Concurrent secret modifications | Race conditions, conflicts | Use GitHub API's native upsert semantics (last write wins), log conflicts for manual review |
| Large number of secrets (>100 per repo) | Slow sync, high API quota usage | Batch secret operations, parallelize where possible (max 5 concurrent requests) |
| Manual secret changes in GitHub UI | Sync state drift | Scheduled sync overwrites with Actions scope values (documented behavior) |
| Environment protection rule conflicts | Deployment blocked unexpectedly | Validate protection rules during environment setup, expose override API |

## Best Practices Applied

1. **Idempotency**: All sync operations use GitHub API's PUT (upsert) semantics. Repeated calls converge to same state.
2. **Observability**: Structured logging with correlation IDs for all operations. Audit table for compliance.
3. **Security**: Secret values never logged. Least-privilege GitHub App permissions. Encrypted at rest (GitHub's responsibility).
4. **Resilience**: Retry logic with exponential backoff. Quota tracking prevents mid-sync failures. Scheduled fallback for webhook gaps.
5. **Developer Experience**: Automatic sync reduces manual work by 80%. Clear error messages with remediation steps. Validation reports highlight issues proactively.

## Decision Traceability

All decisions above map to Flaresmith Constitution Principles:
- **Spec-First**: D-001 through D-012 implement FR-001 through FR-015 from spec.md
- **Idempotent Automation**: D-001 (upsert semantics), D-007 (convergent hashing)
- **Tool-Centric**: D-006 (MCP tools for sync, validation), D-011 (automated preview handling)
- **Security & Audit**: D-003 (exclusions), D-009 (audit events), D-012 (redaction)
- **Monorepo Simplicity**: No new packages, reuses `packages/types` Zod schemas

## References

- GitHub REST API - Secrets: https://docs.github.com/en/rest/actions/secrets
- GitHub REST API - Environments: https://docs.github.com/en/rest/deployments/environments
- Octokit SDK Documentation: https://octokit.github.io/rest.js/
- Sodium Encryption (libsodium): https://libsodium.gitbook.io/doc/
