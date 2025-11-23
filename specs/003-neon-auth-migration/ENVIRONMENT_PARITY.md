# Environment Parity Checklist for Feature 003: Neon Auth Migration

**Task**: T035 - Environment parity check  
**Date**: 2025-11-23  
**Status**: Documentation Complete - Awaiting Deployment

## Overview

This document outlines the required environment parity state for Feature 003 (Neon Auth Migration) across dev/staging/prod environments. It serves as a deployment checklist and validation guide.

## Database Schema Parity (Neon Postgres)

### Required Tables (per environment branch)

All three environment branches (dev/staging/prod) MUST have these tables created via migration `003-001-create-auth-tables.sql`:

1. **`users`** (already exists in base schema)
   - Columns: `id`, `orgId`, `email`, `emailVerified`, `passwordHash`, `name`, `image`, `role`, `createdAt`, `updatedAt`
   - Email should be unique

2. **`identity_provider_links`** (new table)
   - Columns: `id`, `userId`, `provider`, `providerAccountId`, `accessToken`, `refreshToken`, `expiresAt`, `tokenType`, `scope`, `createdAt`, `updatedAt`
   - Composite unique: `(provider, providerAccountId)`
   - Foreign key: `userId` → `users.id`

3. **`sessions`** (new table - formerly `authSessions`)
   - Columns: `id`, `userId`, `refreshTokenHash`, `accessExpiresAt`, `refreshExpiresAt`, `revokedAt`, `createdAt`, `updatedAt`
   - Index on `refreshTokenHash` for fast lookups
   - Foreign key: `userId` → `users.id`

4. **`oauth_state`** (new table)
   - Columns: `id`, `state`, `codeVerifier`, `provider`, `redirectUri`, `expiresAt`, `createdAt`
   - Index on `state` for validation lookups
   - TTL-based cleanup (states older than 10 minutes)

### Migration Status

| Environment | Branch Name | Migration Applied | Validation Method |
|-------------|-------------|-------------------|-------------------|
| Dev | `dev` | ⏳ Pending | Run `./scripts/db/runMigration.sh dev` |
| Staging | `staging` | ⏳ Pending | Run `./scripts/db/runMigration.sh staging` |
| Prod | `prod` | ⏳ Pending | Run `./scripts/db/runMigration.sh prod` |

**Verification Query** (run on each branch):
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'identity_provider_links', 'sessions', 'oauth_state')
ORDER BY table_name;
```

Expected result: 4 rows

## OAuth Provider Configuration Parity

### Required Secrets (per environment)

All environments MUST have these secrets configured via GitHub Secrets and synced to Cloudflare:

#### Apple Sign-In
| Secret Name | Dev Value | Staging Value | Prod Value | Source |
|-------------|-----------|---------------|------------|--------|
| `OAUTH_APPLE_CLIENT_ID` | `com.flaresmith.mobile.dev` | `com.flaresmith.mobile.staging` | `com.flaresmith.mobile` | Apple Developer Portal |
| `OAUTH_APPLE_TEAM_ID` | Same across all envs | Same | Same | Apple Developer Portal |
| `OAUTH_APPLE_KEY_ID` | Same | Same | Same | Apple Developer Portal |
| `OAUTH_APPLE_PRIVATE_KEY` | Same (.p8 file) | Same | Same | Apple Developer Portal |

**Redirect URIs**:
- Dev: `exp://127.0.0.1:19000`, `flaresmith://auth/callback`
- Staging: `https://api-staging.flaresmith.dev/api/auth/oauth/callback`
- Prod: `https://api.flaresmith.dev/api/auth/oauth/callback`

#### Google Sign-In
| Secret Name | Dev Value | Staging Value | Prod Value | Source |
|-------------|-----------|---------------|------------|--------|
| `OAUTH_GOOGLE_CLIENT_ID` | Env-specific | Env-specific | Env-specific | Google Cloud Console |
| `OAUTH_GOOGLE_CLIENT_SECRET` | Env-specific | Env-specific | Env-specific | Google Cloud Console |

**Redirect URIs** (configure in Google Cloud Console OAuth 2.0 Client):
- Dev: `exp://127.0.0.1:19000`, `flaresmith://auth/callback`
- Staging: `https://api-staging.flaresmith.dev/api/auth/oauth/callback`
- Prod: `https://api.flaresmith.dev/api/auth/oauth/callback`

#### GitHub OAuth App
| Secret Name | Dev Value | Staging Value | Prod Value | Source |
|-------------|-----------|---------------|------------|--------|
| `OAUTH_GITHUB_CLIENT_ID` | Env-specific | Env-specific | Env-specific | GitHub Developer Settings |
| `OAUTH_GITHUB_CLIENT_SECRET` | Env-specific | Env-specific | Env-specific | GitHub Developer Settings |

**Redirect URIs** (configure in GitHub OAuth App settings):
- Dev: `http://localhost:8787/api/auth/oauth/callback`, `flaresmith://auth/callback`
- Staging: `https://api-staging.flaresmith.dev/api/auth/oauth/callback`
- Prod: `https://api.flaresmith.dev/api/auth/oauth/callback`

### JWT & Session Management
| Secret Name | Dev Value | Staging Value | Prod Value | Rotation |
|-------------|-----------|---------------|------------|----------|
| `AUTH_JWT_SIGNING_KEY` | Env-specific (HS256) | Env-specific | Env-specific | 90 days |
| `AUTH_JWT_SIGNING_KEY_OLD` | Previous key | Previous | Previous | 7-day grace |

## Cloudflare Workers Deployment Parity

### Environment Variables (wrangler.toml or Cloudflare Dashboard)

Each environment's Worker deployment MUST have:

```toml
[env.dev.vars]
ENVIRONMENT = "dev"
DATABASE_URL = "[Neon dev branch connection string]"
BASE_URL = "https://api-dev.flaresmith.dev"

[env.staging.vars]
ENVIRONMENT = "staging"
DATABASE_URL = "[Neon staging branch connection string]"
BASE_URL = "https://api-staging.flaresmith.dev"

[env.production.vars]
ENVIRONMENT = "prod"
DATABASE_URL = "[Neon prod branch connection string]"
BASE_URL = "https://api.flaresmith.dev"
```

### Route Verification

Confirm these auth routes are accessible in each environment:

| Endpoint | Dev URL | Staging URL | Prod URL |
|----------|---------|-------------|----------|
| Register | `https://api-dev.flaresmith.dev/api/auth/register` | `https://api-staging.flaresmith.dev/api/auth/register` | `https://api.flaresmith.dev/api/auth/register` |
| Login | `.../api/auth/login` | `.../api/auth/login` | `.../api/auth/login` |
| Refresh | `.../api/auth/refresh` | `.../api/auth/refresh` | `.../api/auth/refresh` |
| OAuth Callback | `.../api/auth/oauth/callback` | `.../api/auth/oauth/callback` | `.../api/auth/oauth/callback` |
| Sign Out | `.../api/auth/signout` | `.../api/auth/signout` | `.../api/auth/signout` |
| Sign Out All | `.../api/auth/signoutAll` | `.../api/auth/signoutAll` | `.../api/auth/signoutAll` |

**Test Command** (per environment):
```bash
curl -X POST https://api-dev.flaresmith.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!","name":"Test User"}'

# Expected: 201 Created with tokens
```

## Mobile App Configuration Parity

### Expo Configuration (app.json)

Ensure `apps/mobile/app.json` has environment-specific schemes:

```json
{
  "expo": {
    "scheme": "flaresmith",
    "ios": {
      "bundleIdentifier": "com.flaresmith.mobile"
    },
    "android": {
      "package": "com.flaresmith.mobile"
    }
  }
}
```

### Environment Variables (per deployment)

| Variable | Dev | Staging | Prod |
|----------|-----|---------|------|
| `EXPO_PUBLIC_API_URL` | `https://api-dev.flaresmith.dev` | `https://api-staging.flaresmith.dev` | `https://api.flaresmith.dev` |

## Codemagic CI/CD Parity

### Environment Groups (Codemagic Dashboard)

Ensure these environment variable groups exist and are assigned to workflows:

1. **`expo_credentials`** (all workflows)
   - `EXPO_TOKEN` - Expo authentication token

2. **`github_credentials`** (all workflows)
   - `GITHUB_TOKEN` - GitHub PAT with repo access

3. **`neon_credentials`** (all workflows)
   - `NEON_API_KEY` - Neon API key

4. **`apple_credentials`** (production workflow only)
   - App Store Connect API Key

5. **`google_credentials`** (production workflow only)
   - Google Play Service Account JSON

### Workflow Validation

| Workflow | Trigger Branch | Expected Behavior |
|----------|----------------|-------------------|
| `mobile-dev` | `feature/*`, `fix/*` | EAS Build (development profile) |
| `mobile-staging` | `staging` | EAS Build (preview) + Expo Launch (staging channel) |
| `mobile-production` | `main` | EAS Build (production) + Expo Launch (production) + App Store/Play Store submission |
| `mobile-preview` | Pull Requests | EAS Build (preview) + Ephemeral channel |

## Validation Checklist

### Pre-Deployment (T003 Blocked)
- [ ] Set `DATABASE_URL` environment variable for target environment (dev/staging/prod)
- [ ] Run `./scripts/db/runMigration.sh [env]` to execute migration 003-001
- [ ] Verify tables created via SQL query above

### Post-Deployment
- [ ] **Database**: Confirm all 4 tables exist in each Neon branch
- [ ] **Secrets**: Run `POST /api/github/secrets/validate` - expect 0 missing secrets
- [ ] **API Routes**: Test all 6 auth endpoints per environment (201/200 responses)
- [ ] **Mobile**: Install development build via Expo Go or standalone app
- [ ] **OAuth Flow**: Complete Apple/Google/GitHub sign-in on mobile (dev environment)
- [ ] **Session Refresh**: Wait 14 minutes, verify silent refresh occurs
- [ ] **Sign Out**: Tap sign-out, confirm redirect to login screen
- [ ] **Codemagic**: Trigger staging workflow, verify build succeeds + Expo Launch update created

### Environment Drift Detection

Run drift detector periodically to ensure parity:

```bash
pnpm exec ts-node scripts/spec/driftDetector.ts \
  --spec specs/003-neon-auth-migration \
  --output specs/003-neon-auth-migration/checklists/drift-report-$(date +%Y%m%d).json
```

## Success Criteria Validation

Map to spec.md success criteria:

- **SC-001**: First-time sign-in ≤ 2 minutes → Test on real device with each provider
- **SC-002**: Returning user access ≤ 2 seconds → Relaunch app, measure to dashboard load
- **SC-003**: Session refresh ≥ 99% success → Monitor logs for `AUTH_REFRESH_FAILED` errors
- **SC-004**: 0% sensitive values in logs → Run `scripts/security/scanSecrets.ts` on log output
- **SC-005**: ≥ 95% sign-in success rate → Track `auth.signin.attempted` vs `auth.signin.succeeded` metrics
- **SC-006**: No BetterAuth dependencies → Already validated ✅ (T031 complete)

## Rollback Plan

If parity issues detected post-deployment:

1. **Database**: Revert migration via `./scripts/db/rollbackMigration.sh [env]` (if exists)
2. **API**: Roll back Worker deployment to previous version via Cloudflare dashboard
3. **Mobile**: Publish rollback update via Expo Launch to affected channel
4. **Secrets**: Re-sync from backup using Feature 002 endpoints

## Next Steps

1. **Immediate**: Await `DATABASE_URL` credentials for T003 execution
2. **Phase 6 (Optional)**: Implement MCP tools for auth endpoints (T036-T041)
3. **Phase 7 (Required)**: Add Postman collection, integration tests, metrics (T042-T049)
4. **Production Readiness**: Complete all SC validations before main branch merge

---

**Document Status**: Complete  
**Blockers**: T003 pending DATABASE_URL environment variable  
**Next Review**: After T003 execution and deployment
