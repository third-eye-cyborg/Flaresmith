# Secret Scope Mapping - Quick Reference

## Distribution Matrix

| Secret Name | Codespaces | Dev Env | Staging Env | Prod Env | Cloudflare | Notes |
|-------------|:----------:|:-------:|:-----------:|:--------:|:----------:|-------|
| **Infrastructure** |
| CLOUDFLARE_ACCOUNT_ID | ❌ | ✅ | ✅ | ✅ | N/A | Environment secrets only |
| CLOUDFLARE_API_KEY | ❌ | ✅ | ✅ | ✅ | N/A | Environment secrets only |
| DATABASE_URL | ❌ | ✅* | ✅* | ✅* | ✅ | Different per environment |
| NEON_API_KEY | ❌ | ✅ | ✅ | ✅ | ✅ | Admin-level, restricted |
| **Development Tools** |
| EXPO_TOKEN | ✅ | ❌ | ❌ | ❌ | ❌ | Dev workflow only |
| FIGMA_API_KEY | ✅ | ❌ | ❌ | ❌ | ❌ | Design sync in Codespaces |
| LINEAR_API_KEY | ✅ | ❌ | ❌ | ❌ | ❌ | Issue tracking integration |
| NOTION_API_KEY | ✅ | ❌ | ❌ | ❌ | ❌ | Documentation sync |
| POSTMAN_API_KEY | ✅ | ❌ | ❌ | ❌ | ❌ | API testing in dev |
| POLAR_API_KEY | ✅ | ❌ | ❌ | ❌ | ❌ | Analytics dashboards |
| BUILDER_API_KEY | ✅ | ❌ | ❌ | ❌ | ❌ | CMS content management |
| **Testing Tools** |
| CYPRESS_WEB_TOKEN | ✅ | ❌ | ❌ | ❌ | ❌ | Local E2E testing |
| CYPRESS_MOBILE_TOKEN | ✅ | ❌ | ❌ | ❌ | ❌ | Local E2E testing |
| PLAYWRIGHT_WEB_TOKEN | ✅ | ❌ | ❌ | ❌ | ❌ | Local browser testing |
| PLAYWRIGHT_MOBILE_TOKEN | ✅ | ❌ | ❌ | ❌ | ❌ | Local browser testing |
| STORYBOOK_WEB_TOKEN | ✅ | ❌ | ❌ | ❌ | ❌ | Component development |
| STORYBOOK_MOBILE_TOKEN | ✅ | ❌ | ❌ | ❌ | ❌ | Component development |
| **Runtime Services** |
| OPENAI_API_KEY | ✅ | ✅* | ✅* | ✅* | ✅ | Different keys per env |
| POSTHOG_API_KEY | ❌ | ✅* | ✅* | ✅* | ✅ | Different projects per env |
| ONESIGNAL_API_KEY | ❌ | ✅* | ✅* | ✅* | ❌ | Different apps per env |
| ONESIGNAL_APP_ID | ❌ | ✅* | ✅* | ✅* | ❌ | Different apps per env |
| SLACK_ACCESS_TOKEN | ❌ | ✅* | ✅* | ✅* | ✅ | Different webhooks per env |
| SLACK_REFRESH_TOKEN | ❌ | ✅* | ✅* | ✅* | ✅ | Different webhooks per env |
| **UI/UX Services** |
| MAPBOX_API_KEY | ✅ | ❌ | ❌ | ❌ | ❌ | Maps in development |

**Legend**:
- ✅ = Should be distributed to this scope
- ✅* = Should be distributed with **environment-specific value**
- ❌ = Should NOT be distributed to this scope
- N/A = Not applicable (secret is used to configure this service)

## Environment-Specific Values Required

These secrets need **different values** in each environment:

| Secret | Why Different Values? |
|--------|----------------------|
| DATABASE_URL | Each environment uses isolated Neon branch |
| OPENAI_API_KEY | Dev (free tier) vs Staging/Prod (paid tier) |
| POSTHOG_API_KEY | Separate projects for dev/staging/prod analytics |
| ONESIGNAL_API_KEY | Separate apps to avoid cross-environment notifications |
| ONESIGNAL_APP_ID | Matches separate OneSignal apps |
| SLACK_ACCESS_TOKEN | Different webhooks/channels per environment |
| SLACK_REFRESH_TOKEN | Paired with access tokens |

## Cloudflare Workers/Pages Secrets

Secrets needed in **Cloudflare Workers** (API):

```bash
# Required for runtime
DATABASE_URL          # Neon connection string
OPENAI_API_KEY        # AI features
POSTHOG_API_KEY       # Analytics tracking
SLACK_ACCESS_TOKEN    # Notifications
SLACK_REFRESH_TOKEN   # Token refresh
NEON_API_KEY          # DB management operations
```

Set via wrangler:
```bash
cd apps/api
echo "$DATABASE_URL" | pnpm wrangler secret put DATABASE_URL --env <dev|staging|production>
```

Secrets needed in **Cloudflare Pages** (Web/Mobile):

```bash
# Pages are static - secrets go in build environment variables, not runtime
# Most secrets above are injected during build via GitHub environments
```

## Codespaces Developer Experience

Developers in Codespaces need these for local development:

**✅ Should have**:
- All development tools (FIGMA, LINEAR, NOTION, POSTMAN, POLAR)
- All testing tools (CYPRESS, PLAYWRIGHT, STORYBOOK)
- EXPO_TOKEN for mobile app preview
- MAPBOX_API_KEY for map development
- OPENAI_API_KEY (can use same as dev environment)

**❌ Should NOT have**:
- Production DATABASE_URL (use dev branch)
- Production service keys (ONESIGNAL, POSTHOG prod keys)
- Infrastructure admin keys (CLOUDFLARE_API_KEY, NEON_API_KEY)

## Distribution Command Quick Reference

### Automated (via GitHub Actions)

```bash
# Dry run to preview
Actions → Distribute Secrets
  target_scopes: codespaces,environments
  dry_run: true

# Execute distribution
Actions → Distribute Secrets
  target_scopes: codespaces,environments
  dry_run: false
```

### Manual (via GitHub CLI)

```bash
# Codespaces
gh secret set EXPO_TOKEN --repo third-eye-cyborg/CloudMake --app codespaces

# Environments
gh secret set DATABASE_URL --repo third-eye-cyborg/CloudMake --env dev
gh secret set DATABASE_URL --repo third-eye-cyborg/CloudMake --env staging
gh secret set DATABASE_URL --repo third-eye-cyborg/CloudMake --env production

# Cloudflare (via wrangler)
cd apps/api
echo "$DATABASE_URL" | pnpm wrangler secret put DATABASE_URL --env dev
```

## Exclusion Patterns

These secrets are **automatically excluded** from sync:

| Pattern | Reason |
|---------|--------|
| `GITHUB_*` | Platform-managed by GitHub |
| `ACTIONS_*` | Workflow runtime tokens |
| `RUNNER_*` | Runner environment variables |
| `CI` | CI/CD platform flags |

## Security Best Practices

1. **Never commit secrets** to source control
2. **Use environment-specific values** for DATABASE_URL, API keys with quotas
3. **Rotate secrets regularly** (quarterly recommended)
4. **Limit Codespaces access** to development-tier services only
5. **Audit secret access** via GitHub audit logs
6. **Use least privilege** - only distribute what's needed per scope

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Secret missing in Codespace | Run distribution workflow with `codespaces` scope |
| Wrong DB in deployment | Update environment-specific DATABASE_URL |
| Cloudflare secret not found | `cd apps/api && echo "$VALUE" \| pnpm wrangler secret put NAME --env ENV` |
| Environment not found | Create via Settings → Environments or run distribution workflow |
| Secret conflict warning | Run with `force_overwrite: true` or verify values match |

---

**Workflow**: `.github/workflows/distribute-secrets.yml`  
**Documentation**: `scripts/github/SECRETS_DISTRIBUTION.md`  
**Spec**: `specs/002-github-secrets-sync/spec.md`
