# Implementation Plan: Design Sync & Integration Hub

**Branch**: `006-design-sync-integration` | **Date**: 2025-11-23 | **Spec**: `specs/006-design-sync-integration/spec.md`
**Input**: Feature specification from `/specs/006-design-sync-integration/spec.md`

## Summary
Enable a controlled bidirectional synchronization workflow between coded UI components and their design artifacts, automatically generating and updating documentation (stories) and test scaffolds while providing notification, governance, and browser test integration. Technical approach centers on idempotent sync operations with diff modeling, audit logging, configurable event categories, credential validation, time/cap bounded undo stack, and MCP-driven browser test sessions.

## Technical Context
**Language/Version**: TypeScript (Node 20+, Cloudflare Workers runtime)  
**Primary Dependencies**: Hono (API), Drizzle ORM (Neon Postgres), Zod (validation), Storybook 10, Cypress, Playwright, Builder APIs (Figma-to-Story, Code-to-Design), Slack SDK (notification), OpenAI API (RAG inference hooks), MCP Chrome server, Posthog (telemetry)  
**Storage**: Neon Postgres (new tables for sync operations, mappings, undo entries, notification events)  
**Testing**: Vitest (unit/integration), Playwright (browser flows), Cypress (component & e2e), Storybook test runner, Postman (contract validation)  
**Target Platform**: Edge (Cloudflare Workers) + Web (Next.js) + Mobile (Expo)  
**Project Type**: Monorepo (apps/api, apps/web, apps/mobile, packages/{types,ui,api-client,utils})  
**Performance Goals**: Sync diff generation ≤ 2s for ≤ 50 components; notification dispatch latency p95 < 500ms; browser test session initiation < 3s; coverage report generation ≤ 5s for 200 components  
**Constraints**: API p95 < 300ms, Undo history window 24h (≤50 ops), false positive drift ≤5%, atomic per-component sync, idempotent operations, no secret leakage  
**Scale/Scope**: Initial target: 150 components, avg 3 variants each (~450 stories), daily sync volume ≤ 20, browser test sessions ≤ 50/day

## Constitution Check
1. Spec-First Orchestration: Present. Files: `specs/006-design-sync-integration/spec.md`, checklist completed. All user stories & success criteria defined.
2. Environment Parity & Idempotent Automation: New resources: tables (sync_operations, component_mappings, undo_stack, notification_events, test_sessions). Idempotency via operationId hash (componentIds+timestamp bucket) and diff hash comparisons. Environments dev/staging/prod share schema migrations; no environment-specific logic differences.
3. Tool-/MCP-Centric AI Workflow: MCP additions: `design.sync`, `design.driftReport`, `design.undo`, `design.coverageReport`, `design.browserTestSession.start`, `design.browserTestSession.status`. Input schemas reference Zod definitions in `packages/types/src/design-sync`. Output includes standardized envelopes (success, auditId, metrics). Browser testing leverages existing Chrome MCP server.
4. Security, Observability & Audit: Secrets used: Slack access token, Builder API key, OpenAI key, Storybook tokens, Cypress/Playwright tokens, Figma API key. Least privilege: use existing env injection; no new secrets stored at rest beyond hashed credential metadata. Logs: structured entries per sync/undo with correlationId, componentCount, durationMs. Metrics: sync latency, undo success rate, drift false positive ratio, notification dispatch success. Audit: all actions produce log + audit table row.
5. Monorepo Simplicity & Reusable Primitives: No new package planned; reuse `packages/types` for schemas, `packages/api-client` for client methods. UI additions inside `packages/ui` or `apps/web` feature module. Complexity table not required (no violations).

All gates PASS. Proceeding to Phase 0 & Phase 1 artifacts.

## Project Structure
### Documentation (this feature)
```text
specs/006-design-sync-integration/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md (generated later by /speckit.tasks)
```

### Source Code (repository root)
```text
apps/api/src/
  routes/design-sync/
    sync.ts              # POST /design-sync/operations (execute sync)
    drift.ts             # GET /design-sync/drift
    undo.ts              # POST /design-sync/undo
    coverage.ts          # GET /design-sync/coverage
    credentials.ts       # GET/POST /design-sync/credentials
    schedule.ts          # POST /design-sync/schedule (enable nightly)
    browser-session.ts   # POST /design-sync/browser-session, GET /design-sync/browser-session/:id
  services/designSyncService.ts
  services/designCoverageService.ts
  services/designDriftService.ts
  services/browserTestService.ts
  db/schema/designSync.ts

apps/web/app/(design-sync)/
  components/DiffPreview.tsx
  components/SyncControlPanel.tsx
  components/CoverageDashboard.tsx
  components/CredentialStatusCard.tsx
  components/DriftList.tsx
  components/BrowserSessionViewer.tsx

packages/types/src/design-sync/
  index.ts               # Zod schemas for operations

packages/api-client/src/resources/designSync.ts
packages/ui/src/DesignSync/* (shared primitives if needed)
```

**Structure Decision**: Extend existing API routes & web app feature module; no new top-level apps/packages.

## Complexity Tracking
(No violations; table omitted)

## Phase 0: Research Summary (See `research.md` for details)
Key decisions: time-window undo, expanded notification categories configurable per project, acceptance criteria table for traceability, event-driven diff hashing strategy, per-component atomic apply with partial failure isolation.

## Phase 1: Design Outputs
Will produce `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`. Entities mapped to tables; endpoints defined; example payloads included.

## Phase 2: Task Planning (Deferred)
`/speckit.tasks` will break down implementation by user story and cross-cutting concerns.

## Risks & Mitigations (Implementation Focus)
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Drift algorithm inefficiency | Slower sync start | Pre-compute component metadata hashes; incremental comparison |
| Undo state corruption | Data inconsistency | Wrap sync in transaction; store pre/post state hashes atomically |
| Notification spam | User fatigue | Per-category opt-in flags + daily digest consolidation |
| Credential rotation gap | Failed syncs | Pre-flight validation & proactive expiry reminders |
| Browser session auth flakiness | False test failures | Reusable auth bootstrap script via MCP Chrome tool |

## Performance Considerations
- Hashing: Use stable JSON canonicalization (sorted keys) for diff + pre/post state.
- Batch sync: Stream apply component changes to avoid large payload memory spikes.
- Coverage: Cache last coverage report per component; invalidate on variant/story change.

## Observability Plan
Metrics (Prom-style): `design_sync_duration_ms`, `design_sync_components_count`, `design_drift_false_positive_ratio`, `design_undo_success_total`, `design_notifications_failed_total`, `browser_test_session_latency_ms`. Logs include correlationId, actor, action, counts, durationMs.

## OpenAI / RAG Integration (Phase Later)
Initial placeholder: Use OpenAI embeddings to assist diff explanation (optional) — NOT gating initial release; behind feature flag.

## Implementation Sequencing
1. Schema & migrations (designSync tables)
2. Zod schemas + API route scaffolds
3. Diff & drift algorithms + service layer
4. Sync execution (apply + registry updates + undo stack)
5. Notification dispatcher integration
6. Coverage report generation & test scaffold creator
7. Browser MCP session integration & linking
8. UI components (diff preview, dashboards)
9. Metrics & logging instrumentation
10. Scheduled digest job
11. Polishing & performance tuning
12. RAG-assisted diff explanation (optional)

## Acceptance Gate for Implementation Start
- All design artifacts created (research.md, data-model.md, contracts/openapi.yaml, quickstart.md) ✔
- No outstanding clarifications ✔
- Constitution gates re-validated ✔

---
*End of plan.md*
