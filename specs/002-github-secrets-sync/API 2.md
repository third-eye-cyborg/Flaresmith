# API Documentation: GitHub Secrets Synchronization & Environment Configuration

**Feature**: GitHub Secrets Sync  
**Base Path**: `/github`  
**Authentication**: Bearer token (BetterAuth session)  
**Date**: 2025-11-23

## Overview

This API enables automated synchronization of GitHub repository secrets across scopes (Actions, Codespaces, Dependabot), environment provisioning with protection rules, and secret validation/conflict detection. All endpoints return structured JSON responses with correlation IDs for distributed tracing.

## Endpoints

### 1. Sync Secrets

Synchronize repository secrets from Actions scope to Codespaces and Dependabot scopes.

**Endpoint**: `POST /github/secrets/sync`

**Request Body**:
```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "force": false,
  "targetScopes": ["codespaces", "dependabot"]
}
```

**Request Schema**:
- `projectId` (string, uuid, required): Project identifier
- `force` (boolean, optional): Override conflict detection and force overwrite (default: false)
- `targetScopes` (array[string], optional): Scopes to sync to (default: ["codespaces", "dependabot"])

**Response** (200 OK):
```json
{
  "syncedCount": 15,
  "skippedCount": 2,
  "errors": [
    {
      "secretName": "DATABASE_PASSWORD",
      "scope": "dependabot",
      "error": "GITHUB_SECRETS_RATE_LIMIT_EXHAUSTED",
      "message": "Secondary rate limit reached. Retry after 60 seconds."
    }
  ],
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "durationMs": 3421
}
```

**Response Schema**:
- `syncedCount` (integer): Number of secrets successfully synchronized
- `skippedCount` (integer): Number of secrets skipped (excluded or already synced)
- `errors` (array[object]): List of failures
  - `secretName` (string): Secret that failed
  - `scope` (string): Target scope (codespaces|dependabot)
  - `error` (string): Error code
  - `message` (string): Human-readable error description
- `correlationId` (string, uuid): Trace identifier
- `durationMs` (integer): Operation duration in milliseconds

**Error Responses**:
- `400 Bad Request`: Invalid projectId or targetScopes
- `401 Unauthorized`: Missing or invalid bearer token
- `404 Not Found`: Project not found or GitHub integration not configured
- `429 Too Many Requests`: GitHub API rate limit exhausted
- `500 Internal Server Error`: Unexpected failure (check logs with correlationId)

**Example**:
```bash
curl -X POST https://api.flaresmith.dev/github/secrets/sync \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "force": false
  }'
```

---

### 2. Get Secret Sync Status

Retrieve synchronization status and quota information for a project.

**Endpoint**: `GET /github/secrets/sync/status?projectId={uuid}`

**Query Parameters**:
- `projectId` (string, uuid, required): Project identifier

**Response** (200 OK):
```json
{
  "lastSyncAt": "2025-11-23T14:32:10Z",
  "status": "synced",
  "pendingCount": 0,
  "errorCount": 1,
  "nextScheduledSyncAt": "2025-11-23T20:00:00Z",
  "quotaRemaining": {
    "core": 4850,
    "secrets": 98
  },
  "recentErrors": [
    {
      "secretName": "STAGING_API_KEY",
      "scope": "dependabot",
      "error": "GITHUB_SECRETS_ENCRYPTION_FAILED",
      "occurredAt": "2025-11-23T13:15:22Z"
    }
  ]
}
```

**Response Schema**:
- `lastSyncAt` (string, ISO 8601, nullable): Timestamp of last successful sync
- `status` (enum): Current state (synced|pending|error|never_synced)
- `pendingCount` (integer): Secrets awaiting synchronization
- `errorCount` (integer): Secrets with sync failures
- `nextScheduledSyncAt` (string, ISO 8601): Next automated sync time
- `quotaRemaining` (object): GitHub API quota status
  - `core` (integer): Core API requests remaining (out of 5000/hour)
  - `secrets` (integer): Secrets API requests remaining (out of 100/hour)
- `recentErrors` (array[object]): Last 5 errors (optional)

**Error Responses**:
- `400 Bad Request`: Missing or invalid projectId
- `401 Unauthorized`: Missing or invalid bearer token
- `404 Not Found`: Project not found

**Example**:
```bash
curl "https://api.flaresmith.dev/github/secrets/sync/status?projectId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

### 3. Create Environments

Provision GitHub environments (dev/staging/production) with protection rules and environment-specific secrets.

**Endpoint**: `POST /github/environments`

**Request Body**:
```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "environments": [
    {
      "name": "dev",
      "protectionRules": {
        "requiredReviewers": 0,
        "restrictToMainBranch": false,
        "waitTimer": 0
      },
      "secrets": [
        {
          "name": "NEON_BRANCH_ID",
          "value": "br-dev-abc123"
        },
        {
          "name": "CLOUDFLARE_WORKER_NAME",
          "value": "myrepo-api-dev"
        }
      ],
      "linkedResources": {
        "neonBranchId": "br-dev-abc123",
        "cloudflareWorkerName": "myrepo-api-dev",
        "cloudflarePagesProject": "myrepo-web-dev"
      }
    },
    {
      "name": "production",
      "protectionRules": {
        "requiredReviewers": 1,
        "reviewerIds": [12345],
        "restrictToMainBranch": true,
        "waitTimer": 0
      },
      "secrets": [
        {
          "name": "NEON_BRANCH_ID",
          "value": "br-prod-xyz789"
        }
      ],
      "linkedResources": {
        "neonBranchId": "br-prod-xyz789"
      }
    }
  ]
}
```

**Request Schema**:
- `projectId` (string, uuid, required): Project identifier
- `environments` (array[object], required): Environments to create/update
  - `name` (enum, required): Environment name (dev|staging|production)
  - `protectionRules` (object, required): GitHub environment protection settings
    - `requiredReviewers` (integer, >= 0): Number of approvals needed (default: 0)
    - `reviewerIds` (array[integer], optional): GitHub user IDs for reviewers
    - `restrictToMainBranch` (boolean): Only allow deployments from main branch (default: false)
    - `waitTimer` (integer, minutes): Delay before deployment starts (default: 0)
  - `secrets` (array[object], required): Environment-specific secrets
    - `name` (string, pattern: ^[A-Z][A-Z0-9_]*$): Secret name (uppercase, underscores)
    - `value` (string): Secret value (will be encrypted before storage)
  - `linkedResources` (object, optional): Associated infrastructure
    - `neonBranchId` (string, optional): Neon Postgres branch ID
    - `cloudflareWorkerName` (string, optional): Cloudflare Worker name
    - `cloudflarePagesProject` (string, optional): Cloudflare Pages project name

**Response** (200 OK):
```json
{
  "created": ["dev"],
  "updated": ["production"],
  "errors": [
    {
      "environment": "staging",
      "error": "GITHUB_ENV_REVIEWER_NOT_FOUND",
      "message": "Reviewer user ID 99999 not found in repository collaborators"
    }
  ],
  "correlationId": "660e9500-f30c-52e5-b827-557766551111"
}
```

**Response Schema**:
- `created` (array[string]): Environments successfully created
- `updated` (array[string]): Existing environments successfully updated
- `errors` (array[object]): Failures during provisioning
  - `environment` (string): Environment name that failed
  - `error` (string): Error code
  - `message` (string): Human-readable error description
- `correlationId` (string, uuid): Trace identifier

**Error Responses**:
- `400 Bad Request`: Invalid environment name or protection rules
- `401 Unauthorized`: Missing or invalid bearer token
- `404 Not Found`: Project not found or GitHub repository not configured
- `500 Internal Server Error`: Unexpected failure

**Example**:
```bash
curl -X POST https://api.flaresmith.dev/github/environments \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "environments": [
      {
        "name": "dev",
        "protectionRules": {"requiredReviewers": 0, "restrictToMainBranch": false, "waitTimer": 0},
        "secrets": [{"name": "NEON_BRANCH_ID", "value": "br-dev-123"}],
        "linkedResources": {"neonBranchId": "br-dev-123"}
      }
    ]
  }'
```

---

### 4. Validate Secrets

Validate that all required secrets are present and consistent across scopes.

**Endpoint**: `POST /github/secrets/validate`

**Request Body**:
```json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "requiredSecrets": [
    "DATABASE_URL",
    "API_KEY",
    "CLOUDFLARE_API_TOKEN"
  ]
}
```

**Request Schema**:
- `projectId` (string, uuid, required): Project identifier
- `requiredSecrets` (array[string], required): Secret names to validate

**Response** (200 OK - All Valid):
```json
{
  "valid": true,
  "missing": [],
  "conflicts": [],
  "summary": {
    "totalSecrets": 3,
    "missingCount": 0,
    "conflictCount": 0,
    "validCount": 3
  },
  "remediationSteps": []
}
```

**Response** (207 Multi-Status - Issues Found):
```json
{
  "valid": false,
  "missing": [
    {
      "secretName": "API_KEY",
      "scope": "dependabot"
    },
    {
      "secretName": "CLOUDFLARE_API_TOKEN",
      "scope": "codespaces"
    }
  ],
  "conflicts": [
    {
      "secretName": "DATABASE_URL",
      "scopes": ["actions", "codespaces"],
      "valueHash": {
        "actions": "a3f5d8b2...",
        "codespaces": "1c9e4f7a..."
      },
      "lastSyncedAt": {
        "actions": "2025-11-23T12:00:00Z",
        "codespaces": "2025-11-22T18:30:00Z"
      }
    }
  ],
  "summary": {
    "totalSecrets": 3,
    "missingCount": 2,
    "conflictCount": 1,
    "validCount": 0
  },
  "remediationSteps": [
    {
      "step": 1,
      "action": "Add missing secret API_KEY to dependabot scope",
      "command": "POST /github/secrets/sync with force=true"
    },
    {
      "step": 2,
      "action": "Resolve conflict for DATABASE_URL by syncing from actions scope",
      "command": "POST /github/secrets/sync with force=true"
    }
  ]
}
```

**Response Schema**:
- `valid` (boolean): True if all secrets present and consistent
- `missing` (array[object]): Secrets not found in target scopes
  - `secretName` (string): Missing secret name
  - `scope` (string): Scope where secret is missing (codespaces|dependabot)
- `conflicts` (array[object]): Secrets with differing values across scopes
  - `secretName` (string): Conflicting secret name
  - `scopes` (array[string]): Scopes with mismatched values
  - `valueHash` (object): SHA-256 hash preview per scope (first 12 chars)
  - `lastSyncedAt` (object): Last sync timestamp per scope
- `summary` (object): Validation counts
  - `totalSecrets` (integer): Total secrets validated
  - `missingCount` (integer): Count of missing secrets
  - `conflictCount` (integer): Count of conflicting secrets
  - `validCount` (integer): Count of valid secrets
- `remediationSteps` (array[object]): Actionable guidance to fix issues
  - `step` (integer): Step number
  - `action` (string): Description of fix
  - `command` (string): API call or CLI command to resolve

**Error Responses**:
- `400 Bad Request`: Empty requiredSecrets array or invalid projectId
- `401 Unauthorized`: Missing or invalid bearer token
- `404 Not Found`: Project not found
- `500 Internal Server Error`: Unexpected failure

**Example**:
```bash
curl -X POST https://api.flaresmith.dev/github/secrets/validate \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "requiredSecrets": ["DATABASE_URL", "API_KEY"]
  }'
```

---

## Common Error Codes

| Code | HTTP Status | Description | Remediation |
|------|-------------|-------------|-------------|
| `GITHUB_SECRETS_RATE_LIMIT_EXHAUSTED` | 429 | Primary rate limit (5000/hour) exceeded | Wait until quota resets (check `Retry-After` header) |
| `GITHUB_SECRETS_SECONDARY_RATE_LIMIT` | 429 | Secondary rate limit (100 secret creates/hour) exceeded | Wait 60 seconds and retry |
| `GITHUB_SECRETS_ENCRYPTION_FAILED` | 500 | Failed to encrypt secret value with repo public key | Retry operation (public key may have rotated) |
| `GITHUB_SECRETS_NOT_FOUND` | 404 | Secret not found in source scope | Verify secret exists in GitHub Actions secrets |
| `GITHUB_ENV_REVIEWER_NOT_FOUND` | 400 | Reviewer user ID not in repository collaborators | Add user as repository collaborator first |
| `GITHUB_ENV_PROTECTION_CONFLICT` | 409 | Environment protection rules conflict with existing settings | Use force=true to override or manually resolve in GitHub UI |
| `GITHUB_INTEGRATION_NOT_CONFIGURED` | 404 | Project missing GitHub integration configuration | Complete project setup with GitHub repository link |

---

## Rate Limiting

All endpoints respect GitHub API rate limits:

- **Primary limit**: 5000 requests/hour (authenticated)
- **Secondary limit (secrets)**: 100 secret creates/hour
- **Response headers**:
  - `X-RateLimit-Remaining-GitHub`: Remaining GitHub API quota
  - `X-RateLimit-Reset-GitHub`: Unix timestamp when quota resets
  - `Retry-After`: Seconds to wait before retry (429 responses only)

**Best Practices**:
- Use `GET /github/secrets/sync/status` to check quota before bulk operations
- Enable scheduled sync (every 6 hours) instead of frequent manual syncs
- Implement exponential backoff for 429 responses

---

## Idempotency

All mutation operations (POST) are idempotent:

- **Sync Secrets**: Repeated calls converge to same state (no duplicate sync events)
- **Create Environments**: Creating existing environment updates configuration (upsert semantics)
- **Validate Secrets**: Read-only, always safe to retry

**Idempotency Keys**: Automatically generated based on `{projectId}-{operation}-{resource}`

---

## Correlation IDs

Every response includes a `correlationId` (UUID) for distributed tracing:

- Include in support requests for faster debugging
- Use to correlate logs across services (API → GitHub → Neon → Cloudflare)
- Appears in audit logs (`secret_sync_events` table)

**Example log query**:
```sql
SELECT * FROM secret_sync_events WHERE correlation_id = '550e8400-e29b-41d4-a716-446655440000';
```

---

## Webhooks & Scheduled Jobs

**Webhook Trigger** (Real-time sync):
- Event: `push` to default branch
- Trigger: Commit message contains `[sync-secrets]` OR `.env.example` file modified
- Latency: < 30 seconds from push to sync completion

**Scheduled Sync** (Fallback):
- Frequency: Every 6 hours (cron: `0 */6 * * *`)
- Purpose: Catch manual secret changes via GitHub UI
- Script: `scripts/github/syncSecretsScheduled.ts`

---

## Security Considerations

- **Secret Values**: NEVER logged (only names, scopes, hashes, timestamps)
- **Encryption**: All secret values encrypted with repo public key before GitHub API calls
- **Hashing**: SHA-256 hashes stored in `secret_mappings` table for conflict detection
- **Audit Trail**: All operations logged to `secret_sync_events` with actor ID and correlation ID
- **Redaction**: Middleware automatically redacts secrets from error responses and logs
- **Exclusion Patterns**: Platform-managed secrets (e.g., `GITHUB_TOKEN`) auto-excluded from sync

---

## Additional Resources

- [Feature Specification](./spec.md) - Business requirements and user stories
- [Data Model](./data-model.md) - Database schema and entity relationships
- [Quickstart Guide](./quickstart.md) - End-to-end usage scenarios
- [OpenAPI Specification](./contracts/openapi.yaml) - Machine-readable API contract
- [Postman Collection](../../postman/tests/github-secrets.postman_collection.json) - Contract tests
