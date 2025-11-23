# Data Model: GitHub Secrets Synchronization & Environment Configuration

This document derives entities, fields, relationships, and validation rules from `spec.md` and Phase 0 research decisions.

## Conventions
- ID format: UUID v4 for all entities (consistent with platform bootstrap)
- Timestamps: ISO 8601 strings in UTC (createdAt, updatedAt)
- Soft delete: Not used. Terminal states (failed, archived) serve as archival mechanism
- Booleans: true/false (no 1/0)
- Secret values: NEVER stored in database (only metadata)

## New Entities

### SecretMapping
Represents the relationship between source secret (Actions scope) and target secrets (Codespaces, Dependabot scopes).

- id (uuid) REQUIRED PRIMARY KEY
- projectId (uuid) REQUIRED → Project.id
- secretName (string, 1..100) REQUIRED
- valueHash (string, sha256 hex) REQUIRED (hash of plaintext value for conflict detection, NOT the value itself)
- sourceScope (enum: actions) REQUIRED default actions
- targetScopes (string[], values: codespaces|dependabot) REQUIRED
- isExcluded (boolean) REQUIRED default false (matches exclusion pattern)
- lastSyncedAt (datetime) OPTIONAL (null if never synced)
- syncStatus (enum: pending|synced|failed|conflict) REQUIRED default pending
- errorMessage (string) OPTIONAL (populated when syncStatus=failed)
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

**Indexes**:
- (projectId, secretName) UNIQUE
- (syncStatus, lastSyncedAt) for query efficiency
- (projectId, isExcluded) for filtering

**Constraints**:
- secretName must match pattern `^[A-Z][A-Z0-9_]*$` (uppercase, underscores, starts with letter)
- targetScopes array must not be empty
- valueHash computed as `SHA256(plaintextValue)`, 64 hex characters

---

### GitHubEnvironmentConfig
Represents dev/staging/production environments in GitHub, including environment-specific secrets and protection rules.

- id (uuid) REQUIRED PRIMARY KEY
- projectId (uuid) REQUIRED → Project.id
- environmentName (enum: dev|staging|production) REQUIRED (core environments only, preview envs managed by Environment table)
- githubEnvironmentId (integer) REQUIRED (GitHub's numeric environment ID)
- protectionRules (json) REQUIRED
  - requiredReviewers (integer) default 0
  - reviewerIds (integer[]) OPTIONAL (GitHub user IDs)
  - restrictToMainBranch (boolean) default false
  - waitTimer (integer, minutes) default 0
- secrets (json) REQUIRED (array of environment-specific secrets)
  - [{name: string, value: string (encrypted), lastUpdatedAt: datetime}]
- linkedResources (json) REQUIRED
  - neonBranchId (string) OPTIONAL
  - cloudflareWorkerName (string) OPTIONAL
  - cloudflarePagesProject (string) OPTIONAL
- status (enum: provisioning|active|failed) REQUIRED default provisioning
- lastDeploymentAt (datetime) OPTIONAL
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

**Indexes**:
- (projectId, environmentName) UNIQUE
- (status) for health monitoring

**Constraints**:
- environmentName must be one of dev|staging|production
- protectionRules.requiredReviewers must be >= 0
- secrets array: each secret name must match `^[A-Z][A-Z0-9_]*$`

**Note**: Preview environments are managed via the existing `Environment` entity (kind=preview). This entity only tracks core environments with GitHub-specific configuration.

---

### SecretSyncEvent
Audit record of synchronization operations for compliance and debugging.

- id (uuid) REQUIRED PRIMARY KEY
- projectId (uuid) REQUIRED → Project.id
- actorId (uuid) REQUIRED → User.id (who triggered sync)
- operation (enum: create|update|delete|sync_all|validate) REQUIRED
- secretName (string) OPTIONAL (null for sync_all operations)
- affectedScopes (string[], values: actions|codespaces|dependabot) REQUIRED
- status (enum: success|failure|partial) REQUIRED
- successCount (integer) REQUIRED default 0 (number of scopes successfully updated)
- failureCount (integer) REQUIRED default 0 (number of scopes that failed)
- errorMessage (string) OPTIONAL (populated when status=failure or partial)
- correlationId (uuid) REQUIRED (links related operations)
- durationMs (integer) REQUIRED (operation duration in milliseconds)
- metadata (json) OPTIONAL (additional context: retry attempt, quota remaining, etc.)
- createdAt (datetime) REQUIRED (when operation started)

**Indexes**:
- (projectId, createdAt DESC) for timeline queries
- (correlationId) for trace lookup
- (actorId, createdAt DESC) for user activity audit

**Constraints**:
- successCount + failureCount must equal length of affectedScopes
- status=success implies failureCount=0
- status=failure implies successCount=0
- status=partial implies both successCount>0 and failureCount>0

**Retention**: Partition by month, purge records older than 90 days

---

### SecretExclusionPattern
Configurable patterns for secrets that should NOT be synced.

- id (uuid) REQUIRED PRIMARY KEY
- projectId (uuid) OPTIONAL → Project.id (null for global patterns)
- pattern (string, regex) REQUIRED
- reason (string) REQUIRED (human-readable explanation)
- isGlobal (boolean) REQUIRED default false (global patterns apply to all projects)
- createdBy (uuid) OPTIONAL → User.id
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

**Indexes**:
- (projectId, pattern) UNIQUE (where projectId IS NOT NULL)
- (isGlobal, pattern) UNIQUE (where isGlobal=true)

**Constraints**:
- pattern must be valid JavaScript regex
- Global patterns (isGlobal=true) must have projectId=null
- Project-specific patterns must have projectId set

**Default Global Patterns** (seeded on platform bootstrap):
- `^GITHUB_TOKEN$` - Platform-managed token
- `^ACTIONS_.*` - GitHub Actions runtime variables
- `^RUNNER_.*` - GitHub runner environment variables
- `^CI$` - CI flag
- `^GITHUB_WORKSPACE$` - Workspace path
- `^GITHUB_SHA$` - Commit SHA (runtime injected)
- `^GITHUB_REF$` - Git ref (runtime injected)

---

### GitHubApiQuota
Tracks GitHub API rate limit consumption to prevent mid-sync failures.

- id (uuid) REQUIRED PRIMARY KEY
- projectId (uuid) REQUIRED → Project.id
- quotaType (enum: core|secrets|graphql) REQUIRED
- remaining (integer) REQUIRED (requests remaining in current window)
- limit (integer) REQUIRED (total requests per window)
- resetAt (datetime) REQUIRED (when quota resets)
- lastCheckedAt (datetime) REQUIRED (when we last queried GitHub API)
- createdAt (datetime) REQUIRED
- updatedAt (datetime) REQUIRED

**Indexes**:
- (projectId, quotaType) UNIQUE
- (resetAt) for cleanup of stale records

**Constraints**:
- remaining must be >= 0 and <= limit
- resetAt must be in future at time of update
- lastCheckedAt must be <= now

**Update Strategy**: Refresh on every GitHub API call (parse response headers `X-RateLimit-Remaining`, `X-RateLimit-Limit`, `X-RateLimit-Reset`). Before bulk operations, query this table; if remaining < 100, block operation and return error.

---

## Extended Existing Entities

### Environment (from platform bootstrap, extended fields)

**New Fields**:
- githubEnvironmentId (integer) OPTIONAL (links to GitHub Environment ID for core envs)
- secretsLastSyncedAt (datetime) OPTIONAL (when environment-specific secrets were last synced)
- syncStatus (enum: pending|synced|failed) OPTIONAL (secret sync status for this environment)

**No Schema Changes Required**: These fields are additive and optional, won't break existing platform bootstrap functionality.

**Note**: Preview environments (kind=preview) use this entity but don't create GitHub Environments (too ephemeral). Only core environments (kind=core, name in [dev, staging, production]) create GitHub Environments.

---

## Relationships Summary

- Project 1—* SecretMapping
- Project 1—* GitHubEnvironmentConfig (max 3: dev, staging, production)
- Project 1—* SecretSyncEvent
- Project 1—* SecretExclusionPattern (project-specific patterns)
- Project 1—* GitHubApiQuota (one per quotaType)
- User 1—* SecretSyncEvent (actor tracking)
- Project 1—* Environment (existing relationship from bootstrap, extended fields)

---

## Validation Rules

### API Request Schemas

#### POST /github/secrets/sync
```typescript
{
  projectId: string (uuid),
  secretNames?: string[] (optional, sync specific secrets only),
  targetScopes?: ("codespaces" | "dependabot")[] (optional, default both),
  force?: boolean (optional, overwrite conflicts, default false)
}
```

**Response**:
```typescript
{
  syncedCount: number,
  skippedCount: number,
  errors: Array<{
    secretName: string,
    scope: string,
    error: string,
    code: string
  }>,
  correlationId: string,
  durationMs: number
}
```

#### POST /github/environments
```typescript
{
  projectId: string (uuid),
  environments: Array<{
    name: "dev" | "staging" | "production",
    protectionRules: {
      requiredReviewers?: number,
      reviewerIds?: number[],
      restrictToMainBranch?: boolean,
      waitTimer?: number (minutes)
    },
    secrets: Array<{
      name: string,
      value: string
    }>,
    linkedResources: {
      neonBranchId?: string,
      cloudflareWorkerName?: string,
      cloudflarePagesProject?: string
    }
  }>
}
```

**Response**:
```typescript
{
  created: string[] (environment names),
  updated: string[] (environment names),
  errors: Array<{
    environment: string,
    error: string,
    code: string
  }>,
  correlationId: string
}
```

#### POST /github/secrets/validate
```typescript
{
  projectId: string (uuid),
  requiredSecrets?: string[] (optional, check specific secrets)
}
```

**Response**:
```typescript
{
  valid: boolean,
  missing: Array<{
    secretName: string,
    scope: string
  }>,
  conflicts: Array<{
    secretName: string,
    scopes: string[],
    valueHashes: Record<string, string> (scope -> hash mapping)
  }>,
  summary: {
    totalSecrets: number,
    missingCount: number,
    conflictCount: number,
    validCount: number
  },
  remediationSteps: string[] (actionable guidance)
}
```

#### GET /github/secrets/sync/status
```typescript
// Query params: projectId (uuid)
```

**Response**:
```typescript
{
  lastSyncAt: string (datetime) | null,
  status: "synced" | "pending" | "error" | "never_synced",
  pendingCount: number,
  errorCount: number,
  nextScheduledSyncAt: string (datetime) | null,
  quotaRemaining: {
    core: number,
    secrets: number
  }
}
```

---

## Error Code Taxonomy (Feature-Specific)

Extends platform error taxonomy with GitHub secrets-specific codes:

### GITHUB_SECRETS Category

- `GITHUB_SECRETS_RATE_LIMIT_EXHAUSTED` - Severity: error, RetryPolicy: none
  - Message: "GitHub Secrets API rate limit exhausted. Reset at {resetAt}."
  - Context: { quotaType, remaining, resetAt }

- `GITHUB_SECRETS_ENCRYPTION_FAILED` - Severity: error, RetryPolicy: safe
  - Message: "Failed to encrypt secret value with repository public key."
  - Context: { secretName, error }

- `GITHUB_SECRETS_SYNC_PARTIAL_FAILURE` - Severity: warn, RetryPolicy: idempotent
  - Message: "Secret sync completed with {failureCount} failures out of {totalCount} operations."
  - Context: { successCount, failureCount, failedScopes }

- `GITHUB_SECRETS_EXCLUDED` - Severity: info, RetryPolicy: none
  - Message: "Secret {secretName} excluded from sync (matches pattern {pattern})."
  - Context: { secretName, pattern, isGlobal }

- `GITHUB_SECRETS_CONFLICT_DETECTED` - Severity: warn, RetryPolicy: none
  - Message: "Secret {secretName} has different values across scopes."
  - Context: { secretName, conflictingScopes, valueHashes }

- `GITHUB_SECRETS_NAME_INVALID` - Severity: error, RetryPolicy: none
  - Message: "Secret name must be uppercase with underscores and start with a letter."
  - Context: { secretName, pattern }

### GITHUB_ENV Category

- `GITHUB_ENV_PROTECTION_RULE_CONFLICT` - Severity: error, RetryPolicy: none
  - Message: "Cannot modify protection rules: environment has active deployments."
  - Context: { environment, activeDeployments }

- `GITHUB_ENV_REVIEWER_NOT_FOUND` - Severity: error, RetryPolicy: none
  - Message: "Reviewer user ID {reviewerId} not found in repository."
  - Context: { reviewerId, environment }

- `GITHUB_ENV_ALREADY_EXISTS` - Severity: info, RetryPolicy: idempotent
  - Message: "GitHub environment {environmentName} already exists (idempotent operation)."
  - Context: { environmentName, githubEnvironmentId }

---

## Database Migrations

### Migration 002-001: Create Secret Sync Tables
```sql
-- SecretMapping table
CREATE TABLE secret_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  secret_name VARCHAR(100) NOT NULL CHECK (secret_name ~ '^[A-Z][A-Z0-9_]*$'),
  value_hash CHAR(64) NOT NULL,
  source_scope VARCHAR(20) NOT NULL DEFAULT 'actions',
  target_scopes TEXT[] NOT NULL,
  is_excluded BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, secret_name)
);

CREATE INDEX idx_secret_mappings_sync_status ON secret_mappings(sync_status, last_synced_at);
CREATE INDEX idx_secret_mappings_exclusion ON secret_mappings(project_id, is_excluded);

-- GitHubEnvironmentConfig table
CREATE TABLE github_environment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  environment_name VARCHAR(20) NOT NULL CHECK (environment_name IN ('dev', 'staging', 'production')),
  github_environment_id INTEGER NOT NULL,
  protection_rules JSONB NOT NULL,
  secrets JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_resources JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'provisioning',
  last_deployment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, environment_name)
);

CREATE INDEX idx_github_env_status ON github_environment_configs(status);

-- SecretSyncEvent table (partitioned by month)
CREATE TABLE secret_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  operation VARCHAR(20) NOT NULL,
  secret_name VARCHAR(100),
  affected_scopes TEXT[] NOT NULL,
  status VARCHAR(20) NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  correlation_id UUID NOT NULL,
  duration_ms INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (success_count + failure_count = array_length(affected_scopes, 1))
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_secret_sync_events_project ON secret_sync_events(project_id, created_at DESC);
CREATE INDEX idx_secret_sync_events_correlation ON secret_sync_events(correlation_id);
CREATE INDEX idx_secret_sync_events_actor ON secret_sync_events(actor_id, created_at DESC);

-- Create partitions for current and next 3 months
CREATE TABLE secret_sync_events_2025_11 PARTITION OF secret_sync_events
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE secret_sync_events_2025_12 PARTITION OF secret_sync_events
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE secret_sync_events_2026_01 PARTITION OF secret_sync_events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- SecretExclusionPattern table
CREATE TABLE secret_exclusion_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  pattern VARCHAR(200) NOT NULL,
  reason TEXT NOT NULL,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, pattern) WHERE project_id IS NOT NULL,
  UNIQUE(pattern) WHERE is_global = true,
  CHECK ((is_global = true AND project_id IS NULL) OR (is_global = false AND project_id IS NOT NULL))
);

CREATE INDEX idx_secret_exclusion_global ON secret_exclusion_patterns(is_global, pattern);

-- Seed global exclusion patterns
INSERT INTO secret_exclusion_patterns (pattern, reason, is_global) VALUES
  ('^GITHUB_TOKEN$', 'Platform-managed GitHub token', true),
  ('^ACTIONS_.*', 'GitHub Actions runtime variables', true),
  ('^RUNNER_.*', 'GitHub runner environment variables', true),
  ('^CI$', 'CI flag auto-injected by GitHub', true),
  ('^GITHUB_WORKSPACE$', 'Workspace path auto-injected', true),
  ('^GITHUB_SHA$', 'Commit SHA auto-injected', true),
  ('^GITHUB_REF$', 'Git ref auto-injected', true);

-- GitHubApiQuota table
CREATE TABLE github_api_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  quota_type VARCHAR(20) NOT NULL,
  remaining INTEGER NOT NULL CHECK (remaining >= 0),
  limit_value INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, quota_type),
  CHECK (remaining <= limit_value)
);

CREATE INDEX idx_github_quota_reset ON github_api_quotas(reset_at);
```

---

## Zod Schema Definitions (for packages/types)

Located in `packages/types/src/github/`:

**secretSync.ts**:
```typescript
import { z } from 'zod';

export const SecretSyncRequestSchema = z.object({
  projectId: z.string().uuid(),
  secretNames: z.array(z.string().regex(/^[A-Z][A-Z0-9_]*$/)).optional(),
  targetScopes: z.array(z.enum(['codespaces', 'dependabot'])).optional(),
  force: z.boolean().optional().default(false),
});

export const SecretSyncResponseSchema = z.object({
  syncedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  errors: z.array(z.object({
    secretName: z.string(),
    scope: z.string(),
    error: z.string(),
    code: z.string(),
  })),
  correlationId: z.string().uuid(),
  durationMs: z.number().int().nonnegative(),
});

export type SecretSyncRequest = z.infer<typeof SecretSyncRequestSchema>;
export type SecretSyncResponse = z.infer<typeof SecretSyncResponseSchema>;
```

**environments.ts**:
```typescript
import { z } from 'zod';

export const EnvironmentConfigSchema = z.object({
  name: z.enum(['dev', 'staging', 'production']),
  protectionRules: z.object({
    requiredReviewers: z.number().int().nonnegative().optional().default(0),
    reviewerIds: z.array(z.number().int()).optional(),
    restrictToMainBranch: z.boolean().optional().default(false),
    waitTimer: z.number().int().nonnegative().optional().default(0),
  }),
  secrets: z.array(z.object({
    name: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    value: z.string(),
  })),
  linkedResources: z.object({
    neonBranchId: z.string().optional(),
    cloudflareWorkerName: z.string().optional(),
    cloudflarePagesProject: z.string().optional(),
  }),
});

export const CreateEnvironmentsRequestSchema = z.object({
  projectId: z.string().uuid(),
  environments: z.array(EnvironmentConfigSchema),
});

export const CreateEnvironmentsResponseSchema = z.object({
  created: z.array(z.string()),
  updated: z.array(z.string()),
  errors: z.array(z.object({
    environment: z.string(),
    error: z.string(),
    code: z.string(),
  })),
  correlationId: z.string().uuid(),
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
export type CreateEnvironmentsRequest = z.infer<typeof CreateEnvironmentsRequestSchema>;
export type CreateEnvironmentsResponse = z.infer<typeof CreateEnvironmentsResponseSchema>;
```

**validation.ts**:
```typescript
import { z } from 'zod';

export const SecretValidationRequestSchema = z.object({
  projectId: z.string().uuid(),
  requiredSecrets: z.array(z.string()).optional(),
});

export const SecretValidationResponseSchema = z.object({
  valid: z.boolean(),
  missing: z.array(z.object({
    secretName: z.string(),
    scope: z.string(),
  })),
  conflicts: z.array(z.object({
    secretName: z.string(),
    scopes: z.array(z.string()),
    valueHashes: z.record(z.string()),
  })),
  summary: z.object({
    totalSecrets: z.number().int().nonnegative(),
    missingCount: z.number().int().nonnegative(),
    conflictCount: z.number().int().nonnegative(),
    validCount: z.number().int().nonnegative(),
  }),
  remediationSteps: z.array(z.string()),
});

export type SecretValidationRequest = z.infer<typeof SecretValidationRequestSchema>;
export type SecretValidationResponse = z.infer<typeof SecretValidationResponseSchema>;
```

---

## Performance Considerations

1. **Secret Sync Batching**: Sync max 10 secrets concurrently to GitHub API to avoid rate limits. Use Promise.allSettled() to continue on partial failures.
2. **Quota Caching**: Cache quota status for 1 minute to reduce database queries. Invalidate on 429 responses.
3. **Audit Event Partitioning**: Monthly partitions prevent full table scans. Automated partition creation via scheduled job.
4. **Index Strategy**: Composite indexes on (projectId, createdAt DESC) enable efficient timeline queries without full table scans.
5. **Connection Pooling**: Neon serverless driver uses HTTP, no connection pooling needed (avoids pool exhaustion).

---

## Security Considerations

1. **No Secret Values in Database**: Only store hashes (SHA-256) for conflict detection. Never store plaintext or encrypted values.
2. **Audit Trail Immutability**: SecretSyncEvent records are append-only (no UPDATE/DELETE operations). Partition cleanup is only automated purge mechanism.
3. **Least Privilege GitHub App**: Request minimal scopes (`repo`, `secrets`). Avoid `admin:org` unless organization secrets required.
4. **Correlation ID Tracking**: Every operation generates UUID correlation ID for cross-system tracing without exposing internal IDs.
5. **Secret Name Validation**: Strict regex validation prevents injection attacks via malformed secret names.

---

## Future Enhancements (Out of Scope for P1)

1. Secret rotation tracking (expiry dates, rotation reminders)
2. Secret versioning (track historical values via hashes)
3. Organization-level secrets support (requires GitHub App org permissions)
4. Secret dependency graph (which services use which secrets)
5. Encrypted secret backup to external vault (HashiCorp Vault, AWS Secrets Manager)
6. Secret access audit (who viewed/modified secrets)
7. Compliance reporting (PCI-DSS, SOC 2 requirements)
