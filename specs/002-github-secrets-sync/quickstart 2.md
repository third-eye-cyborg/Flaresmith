# Quickstart: GitHub Secrets Sync & Environment Configuration

This guide shows developers how to use Flaresmith's automated GitHub secret synchronization and environment-specific configuration features.

## Overview

Flaresmith automates GitHub secret management across three scopes:
- **Actions**: Repository secrets for GitHub Actions workflows
- **Codespaces**: Secrets accessible in GitHub Codespaces
- **Dependabot**: Secrets for Dependabot dependency updates

Additionally, it provisions three GitHub environments (dev, staging, production) with environment-specific secrets and protection rules.

## Prerequisites

- Flaresmith project created and provisioned
- GitHub repository connected to project
- Developer or Admin role in project
- Secrets configured in GitHub Actions repository scope (source of truth)

## Typical Workflow

### 1. Add Secrets to GitHub Actions (Manual, One-Time)

Navigate to your GitHub repository settings and add secrets to the Actions scope:

```
Repository → Settings → Secrets and variables → Actions → New repository secret
```

**Recommended Secrets** (from `.env.example`):
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEON_API_KEY`
- `POSTMAN_API_KEY`
- `BETTERAUTH_SECRET`
- `MASTER_ENC_KEY`
- `POSTHOG_API_KEY`

**Environment-Specific Secrets** (values differ per environment):
- `NEON_PROJECT_ID`
- `NEON_BRANCH_ID` (dev/staging/prod branch IDs)
- `CLOUDFLARE_WORKER_NAME`
- `CLOUDFLARE_PAGES_PROJECT`

### 2. Automatic Sync on Project Provisioning

When you provision a new Flaresmith project, secret synchronization happens automatically:

```bash
pnpm exec ts-node scripts/provision/createProject.ts --name "my-project" --org default
```

**What Happens**:
1. Flaresmith reads secrets from GitHub Actions scope
2. Copies eligible secrets to Codespaces and Dependabot scopes
3. Excludes platform-managed secrets (GITHUB_TOKEN, ACTIONS_*, etc.)
4. Creates dev/staging/prod GitHub environments
5. Configures environment-specific secrets and protection rules
6. Links environments to Cloudflare and Neon resources

**Duration**: Typically completes within 10 minutes for a new project with ~15-20 secrets.

### 3. Manual Secret Sync (On-Demand)

Trigger manual synchronization via Flaresmith API:

```bash
curl -X POST https://api.flaresmith.dev/github/secrets/sync \
  -H "Authorization: Bearer $FLARESMITH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

**Response**:
```json
{
  "syncedCount": 15,
  "skippedCount": 3,
  "errors": [],
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "durationMs": 4532
}
```

**Selective Sync** (specific secrets only):
```bash
curl -X POST https://api.flaresmith.dev/github/secrets/sync \
  -H "Authorization: Bearer $FLARESMITH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "secretNames": ["DATABASE_URL", "API_KEY"],
    "targetScopes": ["codespaces"]
  }'
```

### 4. Check Sync Status

Query current synchronization status:

```bash
curl -X GET "https://api.flaresmith.dev/github/secrets/sync/status?projectId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer $FLARESMITH_TOKEN"
```

**Response**:
```json
{
  "lastSyncAt": "2025-11-22T10:30:00Z",
  "status": "synced",
  "pendingCount": 0,
  "errorCount": 0,
  "nextScheduledSyncAt": "2025-11-22T16:30:00Z",
  "quotaRemaining": {
    "core": 4850,
    "secrets": 95
  }
}
```

**Status Values**:
- `synced`: All secrets synchronized successfully
- `pending`: Sync operation in progress or secrets awaiting sync
- `error`: One or more secrets failed to sync (check errors in sync event logs)
- `never_synced`: No sync has been performed yet

### 5. Validate Secrets

Before deploying, validate that all required secrets are present and consistent:

```bash
curl -X POST https://api.flaresmith.dev/github/secrets/validate \
  -H "Authorization: Bearer $FLARESMITH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "requiredSecrets": ["DATABASE_URL", "API_KEY", "JWT_SECRET"]
  }'
```

**Response (All Valid)**:
```json
{
  "valid": true,
  "missing": [],
  "conflicts": [],
  "summary": {
    "totalSecrets": 15,
    "missingCount": 0,
    "conflictCount": 0,
    "validCount": 15
  },
  "remediationSteps": []
}
```

**Response (Issues Detected)**:
```json
{
  "valid": false,
  "missing": [
    {
      "secretName": "POSTMAN_API_KEY",
      "scope": "codespaces"
    }
  ],
  "conflicts": [
    {
      "secretName": "DATABASE_URL",
      "scopes": ["actions", "codespaces"],
      "valueHashes": {
        "actions": "a1b2c3d4...",
        "codespaces": "e5f6g7h8..."
      }
    }
  ],
  "summary": {
    "totalSecrets": 15,
    "missingCount": 1,
    "conflictCount": 1,
    "validCount": 13
  },
  "remediationSteps": [
    "Run sync command to copy POSTMAN_API_KEY to Codespaces and Dependabot scopes",
    "DATABASE_URL has conflicting values - verify correct value in Actions scope and run sync with force=true"
  ]
}
```

### 6. Force Sync (Resolve Conflicts)

If validation detects conflicts, force sync to overwrite with Actions scope values:

```bash
curl -X POST https://api.flaresmith.dev/github/secrets/sync \
  -H "Authorization: Bearer $FLARESMITH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "force": true
  }'
```

**Warning**: This overwrites Codespaces and Dependabot secret values with Actions scope values. Ensure Actions scope has correct values before forcing sync.

## Environment-Specific Configuration

### Understanding GitHub Environments

Flaresmith provisions three GitHub environments with different protection rules:

| Environment | Protection Rules | Use Case |
|-------------|------------------|----------|
| **dev** | No approval required, auto-deploy | Feature development, rapid iteration |
| **staging** | 1 required reviewer, no branch restriction | Pre-production testing, QA validation |
| **production** | 1 required reviewer, main branch only | Production deployments, stable releases |

### Environment-Specific Secrets

Each environment has its own secrets pointing to isolated resources:

**Dev Environment**:
```
NEON_BRANCH_ID = br-dev-abc123
CLOUDFLARE_WORKER_NAME = myproject-api-dev
CLOUDFLARE_PAGES_PROJECT = myproject-web-dev
```

**Staging Environment**:
```
NEON_BRANCH_ID = br-staging-def456
CLOUDFLARE_WORKER_NAME = myproject-api-staging
CLOUDFLARE_PAGES_PROJECT = myproject-web-staging
```

**Production Environment**:
```
NEON_BRANCH_ID = br-prod-ghi789
CLOUDFLARE_WORKER_NAME = myproject-api
CLOUDFLARE_PAGES_PROJECT = myproject-web
```

### Deploying to Environments

GitHub Actions workflows use environment-specific secrets automatically:

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging  # Uses staging environment secrets
    steps:
      - uses: actions/checkout@v3
      - name: Deploy API
        run: |
          wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_WORKER_NAME: ${{ secrets.CLOUDFLARE_WORKER_NAME }}
```

**Key Points**:
- `environment: staging` directive pulls secrets from staging GitHub environment
- Deployment requires manual approval (configured in protection rules)
- Only users specified as reviewers can approve

### Adding/Updating Environment Secrets

Update environment-specific secrets via Flaresmith API:

```bash
curl -X POST https://api.flaresmith.dev/github/environments \
  -H "Authorization: Bearer $FLARESMITH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "123e4567-e89b-12d3-a456-426614174000",
    "environments": [
      {
        "name": "staging",
        "protectionRules": {
          "requiredReviewers": 1,
          "reviewerIds": [12345678]
        },
        "secrets": [
          {
            "name": "NEON_BRANCH_ID",
            "value": "br-staging-updated"
          }
        ],
        "linkedResources": {
          "neonBranchId": "br-staging-updated"
        }
      }
    ]
  }'
```

**Note**: This is idempotent - updating an existing environment only changes specified fields.

## Automated Sync (Scheduled)

Flaresmith runs automatic secret synchronization every 6 hours to ensure consistency. This catches:
- Manual secret changes made in GitHub UI
- Secrets added via other tools
- Drift between scopes

**Scheduled Times** (UTC):
- 00:00, 06:00, 12:00, 18:00

**Override**: Scheduled sync can be disabled per-project via project settings.

## Webhook-Triggered Sync

Real-time sync can be triggered by GitHub webhook events:

**Trigger Conditions**:
1. Push to default branch with commit message containing `[sync-secrets]`
2. Changes to `.env.example` file (detected automatically)
3. Manual dispatch via GitHub Actions workflow

**Example Commit**:
```bash
git commit -m "chore: update API keys [sync-secrets]"
git push
```

**What Happens**:
1. GitHub webhook fires on push event
2. Flaresmith receives webhook payload
3. Secret sync triggered within 30 seconds
4. Sync completion logged in audit trail

## Secret Exclusion Patterns

Certain secrets are automatically excluded from synchronization to prevent conflicts:

**Default Exclusions** (global, cannot be removed):
- `GITHUB_TOKEN` - Platform-managed token
- `ACTIONS_*` - GitHub Actions runtime variables
- `RUNNER_*` - GitHub runner environment variables
- `CI` - CI flag auto-injected by GitHub
- `GITHUB_WORKSPACE`, `GITHUB_SHA`, `GITHUB_REF` - Runtime paths and refs

**Project-Specific Exclusions** (optional):

Add custom exclusion patterns for your project:

```bash
curl -X POST https://api.flaresmith.dev/projects/{projectId}/secret-exclusions \
  -H "Authorization: Bearer $FLARESMITH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pattern": "^LOCAL_.*",
    "reason": "Local development secrets should not be synced"
  }'
```

**Common Use Cases**:
- Exclude local development overrides (`LOCAL_*`)
- Exclude CI-specific secrets (`CI_*`)
- Exclude staging-only secrets from production sync

## Monitoring & Audit

### View Sync History

Sync operations are logged in `secret_sync_events` table with 90-day retention:

```sql
SELECT 
  created_at,
  operation,
  status,
  success_count,
  failure_count,
  duration_ms
FROM secret_sync_events
WHERE project_id = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY created_at DESC
LIMIT 10;
```

**Via API** (future feature):
```bash
curl -X GET "https://api.flaresmith.dev/github/secrets/sync/history?projectId=123e4567-e89b-12d3-a456-426614174000&limit=10" \
  -H "Authorization: Bearer $FLARESMITH_TOKEN"
```

### Correlation ID Tracing

Every sync operation includes a correlation ID for cross-system tracing:

1. Check sync response for `correlationId`
2. Search logs with correlation ID:
   ```bash
   curl -X GET "https://api.flaresmith.dev/logs?correlationId=550e8400-e29b-41d4-a716-446655440000" \
     -H "Authorization: Bearer $FLARESMITH_TOKEN"
   ```
3. View complete operation trace including GitHub API calls, retries, errors

### GitHub API Quota Monitoring

Check remaining GitHub API quota before running bulk operations:

```bash
curl -X GET "https://api.flaresmith.dev/github/secrets/sync/status?projectId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer $FLARESMITH_TOKEN" | jq '.quotaRemaining'
```

**Output**:
```json
{
  "core": 4850,
  "secrets": 95
}
```

**Quota Thresholds**:
- **Green**: >500 core, >50 secrets - Safe to run bulk operations
- **Yellow**: 100-500 core, 10-50 secrets - Proceed with caution, consider batching
- **Red**: <100 core, <10 secrets - Wait for quota reset (shown in `resetAt` field)

## Troubleshooting

### Sync Fails with "Rate Limit Exhausted"

**Error**:
```json
{
  "error": {
    "code": "GITHUB_SECRETS_RATE_LIMIT_EXHAUSTED",
    "message": "GitHub Secrets API rate limit exhausted. Reset at 2025-11-22T11:30:00Z."
  }
}
```

**Solution**:
1. Wait for quota reset (check `resetAt` timestamp)
2. Reduce sync frequency (disable webhook triggers temporarily)
3. Batch secrets into smaller groups (sync 10 at a time)

### Secret Not Syncing (Excluded)

**Symptom**: Secret exists in Actions but not in Codespaces/Dependabot after sync.

**Cause**: Secret matches exclusion pattern.

**Check**:
```bash
curl -X GET "https://api.flaresmith.dev/projects/{projectId}/secret-exclusions" \
  -H "Authorization: Bearer $FLARESMITH_TOKEN"
```

**Solution**: If exclusion is incorrect, delete the pattern and re-sync.

### Conflicts Detected After Manual Changes

**Symptom**: Validation reports conflicts for secrets you manually updated.

**Cause**: Manual changes to Codespaces/Dependabot secrets create hash mismatch with Actions scope.

**Solution**:
1. Update secret in Actions scope (source of truth)
2. Run force sync: `POST /github/secrets/sync` with `force: true`
3. Or manually update all scopes to same value

### Environment Not Created

**Error**:
```json
{
  "error": {
    "code": "GITHUB_ENV_REVIEWER_NOT_FOUND",
    "message": "Reviewer user ID 12345678 not found in repository."
  }
}
```

**Cause**: Reviewer ID doesn't have repository access.

**Solution**:
1. Verify reviewer has repository access (Settings → Collaborators)
2. Use correct GitHub user ID (not username)
3. Or remove `reviewerIds` from request (defaults to project owner)

## Best Practices

### 1. Use Actions Scope as Source of Truth
Always update secrets in GitHub Actions scope first. Codespaces and Dependabot will sync automatically.

### 2. Validate Before Deploying
Run validation endpoint before production deployments to catch missing/conflicting secrets early.

### 3. Review Scheduled Sync Logs
Periodically check sync event logs for failures or warnings. Address issues proactively.

### 4. Use Environment-Specific Secrets for Resources
Never share database connections or API worker names between environments. Use environment-specific secrets.

### 5. Monitor GitHub API Quota
If running many projects, monitor quota usage to avoid hitting limits during critical operations.

### 6. Document Custom Exclusions
If adding project-specific exclusion patterns, document the reason for future maintainers.

### 7. Rotate Secrets via Actions Scope
When rotating secrets (e.g., API keys), update in Actions scope and trigger manual sync for immediate propagation.

## Next Steps

- **API Reference**: See [openapi.yaml](./contracts/openapi.yaml) for complete API documentation
- **Data Model**: Review [data-model.md](./data-model.md) for entity relationships
- **Implementation Tasks**: Run `/speckit.tasks` to see development breakdown

## Support

For issues or questions:
- Check sync status via API: `GET /github/secrets/sync/status`
- View sync history in database: `secret_sync_events` table
- Contact support with correlation ID from failed sync operations
