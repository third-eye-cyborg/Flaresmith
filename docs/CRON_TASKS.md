# CloudMake Scheduled Tasks (CRON)

This document enumerates all automated scheduled tasks (cron jobs) for the CloudMake platform, including purpose, cadence, and execution context.

---

## Overview

CloudMake uses scheduled tasks for:
- Performance monitoring and metrics collection
- Security maintenance (key rotation, secret scanning)
- Database optimization and cleanup
- External service health checks
- Spec drift detection

All tasks are designed to be idempotent and log structured output for observability.

---

## Production Scheduled Tasks

### 1. MCP Server Load Testing
**Script**: `scripts/mcp/loadTestServers.ts`  
**Cadence**: Nightly (02:00 UTC)  
**Purpose**: Execute performance tests against all MCP servers, measure p95 latency and error rates, insert results into `mcp_server_metrics` table.  
**Success Criteria**: SC-021 (MCP list operations ≤500ms p95)  
**Environment**: Production (read-only mode enabled for safety)  
**Thresholds**: Defined in `scripts/mcp/loadTestThresholds.json` (T117)  
**Alert Conditions**: p95 latency >750ms or error rate >5%  
**Logs**: Structured JSON output to stdout; consumed by observability pipeline

### 2. MCP Outage Detection
**Script**: `scripts/mcp/outageDetector.ts`  
**Cadence**: Every 5 minutes  
**Purpose**: Poll circuit breaker states for MCP servers; emit alerts when servers enter OPEN state for >threshold duration.  
**Integration**: Works with graceful degradation service (T113) to provide fallback guidance.  
**Alert Conditions**: Server degraded for >90s  
**Logs**: Circuit breaker state transitions + failure counts

### 3. Spec Drift Detection
**Script**: `scripts/spec/driftDetector.ts`  
**Cadence**: Hourly  
**Purpose**: Compare current codebase state against spec-declared entities, routes, and schemas. Flag divergence blocking merges.  
**Success Criteria**: SC-008 (Design System drift blocking merges)  
**Outputs**: Drift snapshot stored in `mcp_drift_snapshots` table  
**Alert Conditions**: hasDrift=true triggers CI failure + PR comment

### 4. Preview Environment Archival
**Script**: `scripts/preview/archiveExpiredPreviews.ts`  
**Cadence**: Every 6 hours  
**Purpose**: Archive preview environments past TTL (default 72h); free up resources.  
**Database**: Updates `environments` table setting `kind='archived'` where `ttl_expires_at < NOW()`.  
**Metrics**: Decrements `preview_env_active_total` gauge  
**Logs**: Archived environment IDs + resource cleanup summary

### 5. JWT Signing Key Rotation
**Script**: `scripts/security/rotateJwtKey.ts`  
**Cadence**: Every 90 days  
**Purpose**: Generate new JWT signing key, store as active, retain grace key for 7-day overlap.  
**Environment**: Production only (manual trigger for staging/dev)  
**Success Criteria**: SC-011 (Key rotation completed within 24h window)  
**Audit**: Logged to `admin_audit_logs` with operation type `key_rotation`  
**Grace Period**: 7 days (old key remains valid for existing tokens)

### 6. Master Encryption Key Rotation
**Script**: `scripts/security/rotateMasterKey.ts`  
**Cadence**: Annually (manual trigger recommended)  
**Purpose**: Rotate pgcrypto master encryption key used for secrets at rest.  
**Procedure**: Multi-step (generate new key → re-encrypt secrets → update env binding → invalidate old key).  
**Audit**: Logged to `admin_audit_logs` with full operation timeline  
**Downtime**: None (dual-key overlap during migration)

### 7. Secret Scanning (Pre-Commit + CI)
**Script**: `scripts/security/scanSecrets.ts`  
**Cadence**: On every commit (pre-commit hook) + CI pipeline  
**Purpose**: Block commits containing hardcoded secrets (API keys, tokens, private keys).  
**Patterns**: AWS keys, GitHub PATs, generic private keys, provider-specific tokens (T118 extends coverage).  
**Exit Code**: Non-zero if secrets detected → CI fails  
**Logs**: Matched patterns + file locations (sanitized output)

### 8. GitHub Secrets Sync
**Script**: `scripts/github/syncSecretsScheduled.ts`  
**Cadence**: Nightly (01:00 UTC)  
**Purpose**: Sync secrets from database to GitHub Actions, Codespaces, Dependabot scopes; enforce exclusion patterns.  
**Success Criteria**: SC-005 (GitHub Secrets validation)  
**Idempotency**: Hash-based comparison; skip unchanged secrets  
**Quota**: Uses `quotaService` to enforce rate limits (5000 writes/hour)  
**Logs**: Synced/skipped/conflict counts + duration

---

## Development/Staging Tasks

### 9. Database Migration Runner (Manual + CI)
**Script**: `scripts/db/runMigrations.ts`  
**Cadence**: On-demand + CI deployment  
**Purpose**: Apply pending Drizzle migrations to database.  
**Safety**: Idempotent; checks migration history before applying.  
**Logs**: Migration files applied + duration

### 10. Admin Query Benchmark
**Script**: `scripts/db/adminQueryBenchmark.ts`  
**Cadence**: On-demand (post-RLS changes)  
**Purpose**: Measure query performance for admin-scoped queries under RLS policies.  
**Metrics**: p95 latency for user list, audit logs, session queries  
**Target**: Admin queries ≤150ms p95 (SC-004)

---

## Execution Context

### Environment Variables Required
All scheduled scripts require:
- `DATABASE_URL`: Neon Postgres connection string
- `ENVIRONMENT`: `dev|staging|production`
- Provider credentials (context-dependent):
  - `GITHUB_TOKEN` (secrets sync)
  - `CLOUDFLARE_API_TOKEN` (MCP load tests if invoking Cloudflare tools)
  - `POLAR_API_KEY` (billing webhook validation, optional)

### Monitoring & Alerting
- All scripts emit structured JSON logs (Pino format)
- Logs indexed by observability pipeline (e.g., Datadog, PostHog)
- Alert rules defined per task (see individual sections)
- Dashboard: CloudMake Ops (scheduled tasks status + last run timestamps)

### Manual Trigger Examples
```bash
# Run load tests locally
cd scripts/mcp
pnpm exec ts-node loadTestServers.ts

# Force preview archival
cd scripts/preview
pnpm exec ts-node archiveExpiredPreviews.ts --force

# Scan secrets in current commit
cd scripts/security
pnpm exec ts-node scanSecrets.ts --git-diff HEAD~1..HEAD

# Rotate JWT key (requires admin confirmation)
cd scripts/security
pnpm exec ts-node rotateJwtKey.ts --confirm
```

---

## Deployment

### Cloudflare Workers Cron Triggers
Scheduled tasks are configured in `apps/api/wrangler.toml`:

```toml
[triggers]
crons = [
  "0 2 * * *",   # MCP load tests (nightly 02:00 UTC)
  "0 1 * * *",   # GitHub secrets sync (nightly 01:00 UTC)
  "*/5 * * * *", # MCP outage detection (every 5 min)
  "0 * * * *",   # Spec drift detection (hourly)
  "0 */6 * * *"  # Preview archival (every 6 hours)
]
```

### CI Integration
GitHub Actions workflows (`.github/workflows/`) include:
- `pre-commit.yml`: Secret scanning on every commit
- `deploy-staging.yml`: Migration runner before deployment
- `nightly-tests.yml`: Load tests + drift detection

---

## Future Enhancements (Post-Feature 005)
- **Design System Token Propagation Monitoring**: Track time from token version commit to availability across apps (SC-002 target ≤5m).
- **Accessibility Audit Automation**: Scheduled runs of design system accessibility audits (SC-003 target ≥98% AA compliance).
- **Rate Limit Quota Monitoring**: Alert when user/project buckets frequently exhausted (proactive scaling signal).

---

**Last Updated**: 2025-11-23  
**Feature**: 005-dual-auth-architecture (T114)  
**Owned By**: Platform Engineering
