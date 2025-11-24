# Secrets Distribution Guide

This guide explains how CloudMake distributes secrets across scopes and environments, tracing to Spec 002 (GitHub Secrets Synchronization & Environment Configuration).

## Overview
Secrets originate from a single source of truth: your local `.env` (never committed) or initial GitHub Actions repository secrets. They are then propagated to:

| Scope | Purpose | Method |
|-------|---------|--------|
| GitHub Actions (repo) | Workflow execution | `importEnvSecrets.ts` / distribution script |
| GitHub Codespaces | Developer environments | API upsert (encrypted) |
| GitHub Dependabot | Dependency updates requiring auth | API upsert (encrypted) |
| GitHub Environments (dev/staging/production) | Deployment gating & environment-specific overrides | API upsert per environment |
| Cloudflare Workers/Pages | Runtime edge deployment secrets | Cloudflare API (Workers script secrets) |
| Codemagic (mobile CI) | Expo builds & publishing | codemagic.yaml groups (expo/github/neon/analytics/billing/builder) |
| Neon | DB connection strings (per branch) | Stored as environment secrets (DATABASE_URL) |

## Scripts

1. `pnpm import:env-secrets` – Imports local `.env` values into GitHub Actions repo secrets.
2. `pnpm distribute:env-secrets -- --owner <owner> --repo <repo> --dry-run --validate` – Classifies and distributes secrets to all supported scopes.

Add `--force` to overwrite existing secrets (use sparingly).

## Environment-Specific Mapping
Variables suffixed with `_DEV`, `_STAGING`, `_PROD` are mapped to a base name for GitHub Environments and Cloudflare Workers:

```
DATABASE_URL_DEV     -> env:dev DATABASE_URL
DATABASE_URL_STAGING -> env:staging DATABASE_URL
DATABASE_URL_PROD    -> env:production DATABASE_URL
NEON_BRANCH_DEV      -> env:dev NEON_BRANCH_ID
NEON_BRANCH_STAGING  -> env:staging NEON_BRANCH_ID
NEON_BRANCH_PROD     -> env:production NEON_BRANCH_ID
```

If only one suffixed variant exists, others fallback to dev or global value.

## Exclusions
Platform-managed or ephemeral tokens are excluded by default:
- `GITHUB_TOKEN`, `ACTIONS_*`, `RUNNER_*`, `CI`, `PNPM_*`, `NPM_*`

Provide custom patterns with `--exclude "^SECRET_NAME$"`.

## Validation
Pass `--validate` to invoke `POST /github/secrets/validate` after distribution;
this checks for:
- Missing secrets per scope
- Value conflicts (where detectable)
- Environment-specific presence

## Cloudflare
The script parses `apps/api/wrangler.toml` `[env.*]` sections to discover Worker script names:
- `cloudmake-api-dev`
- `cloudmake-api-staging`
- `cloudmake-api-prod`

It then pushes non-public secrets plus environment overrides via:
`POST /accounts/:accountId/workers/scripts/:script/secrets`

Public (`NEXT_PUBLIC_`, `EXPO_PUBLIC_`) variables are intentionally skipped for secret scopes.

## Codemagic
`codemagic.yaml` references secret groups (e.g., `analytics_credentials`, `billing_credentials`). Values are managed securely in Codemagic UI; the file only exposes variable names.

## Safety & Idempotency
- All upserts are idempotent (repeated runs converge state).
- Dry-run mode logs intended operations without mutation.
- Secret values are never printed or logged.
- Errors per scope are isolated; partial failures do not abort other scopes.

## Rotation Guidance
For rotating signing keys (`AUTH_JWT_SIGNING_KEY`):
1. Add new key as `AUTH_JWT_SIGNING_KEY`.
2. Move previous key to `AUTH_JWT_SIGNING_KEY_OLD` for grace period (7 days).
3. Run distribution script.
4. After grace period remove old key & rerun.

## Example Dry Run
```
pnpm distribute:env-secrets -- --owner third-eye-cyborg --repo CloudMake --dry-run --validate
```

## Troubleshooting
| Symptom | Cause | Action |
|---------|-------|--------|
| Missing Codespaces secret | PAT lacks `codespaces` scope | Regenerate PAT with required scopes |
| Cloudflare sync skipped | Missing `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | Export both env vars before running |
| Validation endpoint errors | Local API not running | Start API (`pnpm dev`) then rerun with `--validate` |
| Wrong DATABASE_URL in staging | Suffix variable absent | Add `DATABASE_URL_STAGING` to `.env` and re-run |
| NEON_BRANCH_ID not set | Using NEON_BRANCH_* names only | Script now aliases NEON_BRANCH_* → NEON_BRANCH_ID |

## Required PAT Scopes
`repo`, `actions`, `codespaces`, `dependabot`, `admin:repo_hook` (for environments)

## Future Enhancements
- Preview environment secret cloning
- Dependabot diff-based deletion on source removal
- Automatic rotation scheduling + audit report

---
Spec Reference: `specs/002-github-secrets-sync/spec.md` (FR-001..FR-015)

## GitHub Actions Workflow (Automated Sync)
The workflow `.github/workflows/secrets-sync.yml` runs on push (main, staging, feature/*, fix/*) and manual dispatch. It loads selected repository secrets into environment variables, then executes `scripts/github/workflowSyncSecrets.ts` to propagate values.

Key inputs & env lists:
| Variable | Purpose |
|----------|---------|
| `SYNC_GLOBALS` | Comma list of secret names distributed to Actions + Codespaces + Dependabot + all environments |
| `SYNC_ENV_BASES` | Bases that have environment suffix variants (e.g. `DATABASE_URL_DEV`) |
| `SYNC_ENV_BRANCHES` | Bases that map suffixed variants to `*_ID` (e.g. `NEON_BRANCH_DEV` → `NEON_BRANCH_ID`) |
| `DRY_RUN` | When `true`, prints planned operations without mutation |

Dispatch with dry-run false (manual):
```
gh workflow run secrets-sync.yml -f dryRun=false
```

Add new secret names by editing the `Prepare env lists` step or uncomment optional environment-specific lines in the `env:` block.

Safety rules enforced:
1. No secret values logged (only names)
2. Missing secrets skipped gracefully
3. Idempotent upserts (setting same value twice causes no divergence)
4. Alias mapping provides `NEON_BRANCH_ID` per environment when branch suffix secrets present

To extend for preview environments, add a matrix job enumerating dynamically provisioned preview branches and set `ENVIRONMENT=preview-<slug>` with derived secret subset.
