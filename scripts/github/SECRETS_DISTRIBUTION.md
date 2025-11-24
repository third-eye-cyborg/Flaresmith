# GitHub Secrets Distribution Guide

## Overview

This guide explains how to distribute secrets from GitHub Actions repository secrets to other scopes (Codespaces, Environments, Cloudflare, Neon) for the CloudMake/Flaresmith project.

## Current Secrets Inventory

Based on your repository secrets, here's the complete list:

| Secret Name | Added | Purpose |
|-------------|-------|---------|
| CLOUDFLARE_ACCOUNT_ID | 2h ago | Cloudflare account identifier |
| CLOUDFLARE_API_KEY | now | Cloudflare API authentication |
| CYPRESS_MOBILE_TOKEN | 52m ago | Mobile E2E testing |
| CYPRESS_WEB_TOKEN | 54m ago | Web E2E testing |
| DATABASE_URL | yesterday | Neon Postgres connection string |
| EXPO_TOKEN | 2h ago | Expo publishing & updates |
| FIGMA_API_KEY | 42m ago | Figma design integration |
| LINEAR_API_KEY | 1h ago | Linear project management |
| MAPBOX_API_KEY | 2h ago | Map services |
| NEON_API_KEY | yesterday | Neon database management |
| NOTION_API_KEY | 1h ago | Notion integration |
| ONESIGNAL_API_KEY | yesterday | Push notifications |
| ONESIGNAL_APP_ID | yesterday | OneSignal app identifier |
| OPENAI_API_KEY | 29m ago | AI/LLM features |
| PLAYWRIGHT_MOBILE_TOKEN | 52m ago | Mobile browser testing |
| PLAYWRIGHT_WEB_TOKEN | 1h ago | Web browser testing |
| POLAR_API_KEY | 2h ago | Polar analytics |
| POSTHOG_API_KEY | yesterday | Product analytics |
| POSTMAN_API_KEY | yesterday | API testing |
| SLACK_ACCESS_TOKEN | 35m ago | Slack integration (access) |
| SLACK_REFRESH_TOKEN | 35m ago | Slack integration (refresh) |
| STORYBOOK_MOBILE_TOKEN | 53m ago | Component library (mobile) |
| STORYBOOK_WEB_TOKEN | - | Component library (web) |

## Secret Distribution Strategy

### 1. Codespaces Secrets (Development Environment)

**Target**: Secrets developers need in GitHub Codespaces

**Scope**: Non-environment-specific development tools

```
✅ Include:
- EXPO_TOKEN
- FIGMA_API_KEY
- LINEAR_API_KEY
- MAPBOX_API_KEY
- NOTION_API_KEY
- OPENAI_API_KEY (dev tier)
- POSTMAN_API_KEY
- POLAR_API_KEY
- CYPRESS_WEB_TOKEN
- CYPRESS_MOBILE_TOKEN
- PLAYWRIGHT_WEB_TOKEN
- PLAYWRIGHT_MOBILE_TOKEN
- STORYBOOK_WEB_TOKEN
- STORYBOOK_MOBILE_TOKEN

❌ Exclude:
- DATABASE_URL (use dev-specific)
- CLOUDFLARE_* (environment-specific)
- NEON_API_KEY (admin-level)
- ONESIGNAL_* (environment-specific)
- SLACK_* (use dev webhooks)
```

### 2. GitHub Environments

CloudMake uses three canonical environments with isolated resources:

#### **Dev Environment**
- **Branch**: `feature/*`, `dev`
- **Protection**: None (automatic deployments)
- **Resources**: Dev-tier services

```yaml
Secrets:
  DATABASE_URL: <neon-dev-branch-connection-string>
  CLOUDFLARE_ACCOUNT_ID: <account-id>
  CLOUDFLARE_API_KEY: <api-key>
  NEON_API_KEY: <api-key>
  OPENAI_API_KEY: <dev-tier-key>
  POSTHOG_API_KEY: <dev-project>
  ONESIGNAL_API_KEY: <dev-app>
  ONESIGNAL_APP_ID: <dev-app-id>
  SLACK_ACCESS_TOKEN: <dev-webhook>
  SLACK_REFRESH_TOKEN: <dev-refresh>
```

#### **Staging Environment**
- **Branch**: `staging`
- **Protection**: Requires 1 approval
- **Resources**: Staging-tier services

```yaml
Secrets:
  DATABASE_URL: <neon-staging-branch-connection-string>
  CLOUDFLARE_ACCOUNT_ID: <account-id>
  CLOUDFLARE_API_KEY: <api-key>
  NEON_API_KEY: <api-key>
  OPENAI_API_KEY: <staging-tier-key>
  POSTHOG_API_KEY: <staging-project>
  ONESIGNAL_API_KEY: <staging-app>
  ONESIGNAL_APP_ID: <staging-app-id>
  SLACK_ACCESS_TOKEN: <staging-webhook>
  SLACK_REFRESH_TOKEN: <staging-refresh>
```

#### **Production Environment**
- **Branch**: `main`
- **Protection**: Requires 1 approval + branch protection
- **Resources**: Production-tier services

```yaml
Secrets:
  DATABASE_URL: <neon-prod-branch-connection-string>
  CLOUDFLARE_ACCOUNT_ID: <account-id>
  CLOUDFLARE_API_KEY: <api-key>
  NEON_API_KEY: <api-key>
  OPENAI_API_KEY: <production-tier-key>
  POSTHOG_API_KEY: <production-project>
  ONESIGNAL_API_KEY: <production-app>
  ONESIGNAL_APP_ID: <production-app-id>
  SLACK_ACCESS_TOKEN: <production-webhook>
  SLACK_REFRESH_TOKEN: <production-refresh>
```

### 3. Cloudflare Workers/Pages

**Target**: Runtime secrets for Cloudflare-deployed applications

**Distribution**: Environment-specific via wrangler

```bash
# Dev environment
echo "$DATABASE_URL" | pnpm --filter @flaresmith/api wrangler secret put DATABASE_URL --env dev
echo "$OPENAI_API_KEY" | pnpm --filter @flaresmith/api wrangler secret put OPENAI_API_KEY --env dev

# Staging environment
echo "$DATABASE_URL" | pnpm --filter @flaresmith/api wrangler secret put DATABASE_URL --env staging

# Production environment
echo "$DATABASE_URL" | pnpm --filter @flaresmith/api wrangler secret put DATABASE_URL --env production
```

**Secrets needed in Cloudflare**:
- DATABASE_URL
- OPENAI_API_KEY
- POSTHOG_API_KEY
- SLACK_ACCESS_TOKEN
- SLACK_REFRESH_TOKEN
- NEON_API_KEY

### 4. Neon Database Branches

**Configuration**: Connection strings are environment-specific

**Mapping**:
```
dev environment → NEON_DEV_BRANCH_ID
staging environment → NEON_STAGING_BRANCH_ID
production environment → NEON_PROD_BRANCH_ID
```

**Usage**: Each environment's `DATABASE_URL` should point to its respective branch.

## Distribution Methods

### Method 1: Automated via GitHub Actions (Recommended)

We've created a workflow that can distribute secrets automatically.

**Usage**:
1. Go to **Actions** → **Distribute Secrets**
2. Click **Run workflow**
3. Select target scopes:
   - `codespaces` - Distribute to Codespaces
   - `environments` - Distribute to dev/staging/prod environments
   - `cloudflare` - Distribute to Cloudflare Workers
   - `neon` - Configure Neon branches (future)
4. Enable **dry run** to preview changes
5. Click **Run workflow**

**Example**:
```yaml
Target Scopes: codespaces,environments
Dry Run: false
Force Overwrite: false
```

This will:
- ✅ Copy development secrets to Codespaces
- ✅ Create three GitHub environments (dev, staging, production)
- ✅ Distribute environment-specific secrets
- ✅ Set Cloudflare Workers secrets (if selected)

### Method 2: Manual via GitHub UI

#### For Codespaces:
1. Go to **Settings** → **Secrets and variables** → **Codespaces**
2. Click **New repository secret**
3. Copy each secret from Actions scope
4. Paste into Codespaces scope

#### For Environments:
1. Go to **Settings** → **Environments**
2. Create environments: `dev`, `staging`, `production`
3. For each environment:
   - Click **Add secret**
   - Set environment-specific secrets

### Method 3: GitHub CLI

```bash
# Set Codespace secret
gh secret set EXPO_TOKEN --repo third-eye-cyborg/CloudMake --app codespaces --body "<value>"

# Set environment secret
gh secret set DATABASE_URL --repo third-eye-cyborg/CloudMake --env dev --body "<dev-db-url>"
gh secret set DATABASE_URL --repo third-eye-cyborg/CloudMake --env staging --body "<staging-db-url>"
gh secret set DATABASE_URL --repo third-eye-cyborg/CloudMake --env production --body "<prod-db-url>"
```

### Method 4: API via TypeScript (Advanced)

Use the provided script (requires workflow context for secret values):

```bash
pnpm exec tsx scripts/github/distributeSecrets.ts \
  --owner third-eye-cyborg \
  --repo CloudMake \
  --dry-run
```

**Note**: This script can only verify and document distribution since the GitHub API doesn't allow reading secret values.

## Quick Start (Recommended Approach)

**Step 1**: Run the automated workflow with dry run
```
Actions → Distribute Secrets → Run workflow
  target_scopes: codespaces,environments
  dry_run: true
```

**Step 2**: Review the output

**Step 3**: Run it for real
```
Actions → Distribute Secrets → Run workflow
  target_scopes: codespaces,environments
  dry_run: false
```

**Step 4**: Verify in GitHub Settings
- Settings → Secrets and variables → Codespaces
- Settings → Environments → dev/staging/production

**Step 5**: Distribute to Cloudflare
```
Actions → Distribute Secrets → Run workflow
  target_scopes: cloudflare
  dry_run: false
```

## Environment-Specific Secret Values

Some secrets should have **different values** per environment:

| Secret | Dev Value | Staging Value | Production Value |
|--------|-----------|---------------|------------------|
| DATABASE_URL | Neon dev branch | Neon staging branch | Neon prod branch |
| OPENAI_API_KEY | Dev tier key | Staging tier key | Prod tier key |
| POSTHOG_API_KEY | Dev project | Staging project | Prod project |
| ONESIGNAL_APP_ID | Dev app | Staging app | Prod app |
| SLACK_ACCESS_TOKEN | Dev webhook | Staging webhook | Prod webhook |

**Important**: You'll need to manually update these in each environment after initial distribution.

## Security Considerations

### Excluded Secrets (Platform-Managed)
These secrets are automatically excluded from sync:
- `GITHUB_TOKEN` - Platform-managed
- `ACTIONS_RUNTIME_TOKEN` - Platform-managed
- `ACTIONS_ID_TOKEN_REQUEST_TOKEN` - Platform-managed

### Secret Rotation
When rotating secrets:
1. Update in Actions secrets
2. Re-run distribution workflow
3. Verify all scopes updated
4. Test deployments

### Audit Trail
All distribution operations are logged in:
- GitHub Actions workflow runs
- `secret_sync_events` database table (when using API)

## Troubleshooting

### "Secret not found" in Codespaces
**Cause**: Secret not distributed to Codespaces scope  
**Fix**: Run workflow with `codespaces` in target scopes

### "Environment secret mismatch" in deployment
**Cause**: Environment secret not set or outdated  
**Fix**: 
1. Check Settings → Environments → [env] → Secrets
2. Re-run distribution workflow with `force_overwrite: true`

### "Cloudflare secret missing"
**Cause**: Secrets not set in Cloudflare Workers  
**Fix**: 
```bash
cd apps/api
echo "$SECRET_VALUE" | pnpm wrangler secret put SECRET_NAME --env production
```

### "Database connection failed"
**Cause**: DATABASE_URL points to wrong Neon branch  
**Fix**: Update environment-specific DATABASE_URL to correct branch connection string

## Next Steps

1. ✅ Run distribution workflow with dry run
2. ✅ Verify secret scopes in GitHub Settings
3. ✅ Update environment-specific secret values
4. ✅ Test deployments in each environment
5. ✅ Document any custom secret requirements

## References

- [GitHub Secrets Sync Spec](../specs/002-github-secrets-sync/spec.md)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Neon Branching](https://neon.tech/docs/guides/branching)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)

---

**Last Updated**: 2025-11-23  
**Maintained By**: CloudMake Platform Team
