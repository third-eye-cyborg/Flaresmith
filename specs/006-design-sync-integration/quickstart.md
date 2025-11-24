# Quickstart: Design Sync & Integration Hub

## Prerequisites
- Valid credentials stored in environment/GitHub secrets: notification (Slack), design (Builder/Figma), documentation (Storybook tokens), testing (Cypress/Playwright), ai (OpenAI), analytics (Posthog).
- Database migrations applied adding design sync tables.
- Roles configured (Admin, Maintainer, Developer, Viewer).

## Credential Mapping & Rotation Policy

| Category | Purpose | Required Env Variables | Rotation Interval | Notes |
|----------|---------|------------------------|-------------------|-------|
| notification | Slack channel & digest dispatch | `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET` | 90d (align with JWT signing cadence) | Bot token scopes: chat:write, channels:read |
| design | Builder + Figma artifact resolution | `BUILDER_API_TOKEN`, `FIGMA_PERSONAL_ACCESS_TOKEN` | 60d | Least privilege; restrict Figma token to file read |
| documentation | Storybook publishing & Chromatic visual baseline | `CHROMATIC_PROJECT_TOKEN` | 30d | Token used for visual regression & story indexing |
| testing | Automated test service integration | `CYPRESS_RECORD_KEY`, `PLAYWRIGHT_API_TOKEN` | 90d | Playwright key optional if using cloud service; Cypress key for dashboard |
| ai | Optional RAG diff explanation & embeddings | `OPENAI_API_KEY` | 90d | Only required if `DESIGN_SYNC_RAG_EXPLAIN=true` |
| analytics | Product usage & sync event tracking | `POSTHOG_API_KEY`, `POSTHOG_HOST` | 180d | Host may be self-hosted or cloud; keep minimal scopes |
| work mgmt (future) | Notion / Linear linking (future phase) | `NOTION_API_KEY`, `LINEAR_API_KEY` | 60d | Not required for MVP; prepare placeholders |

Rotation automation jobs should emit a `credential_status` notification event upon successful renewal or failure. Revocation sets `status=revoked` and blocks dependent sync flows until replaced. Validation endpoints must never log raw token values—only hashed digests.

### Pre-Flight Credential Validation
Sync initiation performs a shallow validation:
1. Presence of required env vars for categories in use.
2. Token format sanity (length, prefix if any).
3. Optional live ping (Slack auth.test, Builder whoami, OpenAI models list) — failures abort sync with actionable error code.

### Rotation Workflow (Admin/Maintainer)
1. Invoke POST /design-sync/credentials `{ providerType: 'design', action: 'rotate' }`.
2. System requests new token input via secure channel (out of scope UI — CLI or secret manager).
3. Upon success, updates `rotation_due` and emits notification event.
4. Failed rotation logs `dispatch_status=failed` event with retry guidance.

### Security Hardening
- Never store tokens beyond environment variable layer; `credential_records.metadata` holds non-secret metadata only (scopes, last4 hash fragment).
- All credential actions include `correlationId` and are audited.
- Feature flag `DESIGN_SYNC_RAG_EXPLAIN` must remain `false` unless OpenAI usage approved.

## 1. Enable Feature Flag (if using flags)
Set `DESIGN_SYNC_ENABLED=true` in environment secrets for dev.

## 2. Map Components to Design Artifacts
1. Navigate to Design Sync panel in web app.
2. Select a component; use "Link Design" to associate Figma node id via Builder mapping.
3. Save mapping; status updates to `mapped`.

## 3. Run a Manual Sync
1. Press "Sync" → diff preview loads (components, variants, direction defaults).
2. Toggle direction or exclude variants.
3. Confirm; observe status banner and audit log entry.
4. Optional: Click "Undo" within 24h to revert.

## 4. Review Coverage
1. Open Coverage Dashboard.
2. View variant coverage %; click component for missing variants/tests.
3. Generate scaffolds if missing (action triggers test file generation).

## 5. Manage Credentials
1. Open Credentials page.
2. Validate or rotate a credential (Admin/Maintainer only).
3. Revoked credential blocks dependent actions with remediation guidance.

## 6. Browser Test Session
1. From a story page, click "Launch Browser Session".
2. Choose auth profile; start session.
3. Monitor status & performance metrics; link stored in audit trail.

## 7. Configure Notifications
1. Open Notification Preferences.
2. Enable/disable categories (sync, drift, coverage, digest, credential, browser failures).
3. Save; triggers preference update recorded in audit log.

## 8. Scheduled Digest
1. Admin toggles nightly digest schedule.
2. Cron or scheduled worker compiles summaries.
3. Digest entry posted to channel; stored as notification_event.

## Failure & Recovery
- Partial sync failures: unaffected components complete; review diffSummary for errors.
- Credential invalid: sync blocked; rotate credential then retry.
- Undo expired: operation no longer reversible; performed state persists.

## Observability
Metrics available via monitoring endpoint; correlationId displayed in UI for each sync.

---
*End of quickstart.md*
