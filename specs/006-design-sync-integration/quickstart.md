# Quickstart: Design Sync & Integration Hub

## Prerequisites
- Valid credentials stored in environment/GitHub secrets: notification (Slack), design (Builder/Figma), documentation (Storybook tokens), testing (Cypress/Playwright), ai (OpenAI), analytics (Posthog).
- Database migrations applied adding design sync tables.
- Roles configured (Admin, Maintainer, Developer, Viewer).

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
