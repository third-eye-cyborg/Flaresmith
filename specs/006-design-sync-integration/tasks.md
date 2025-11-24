# Task Breakdown: Design Sync & Integration Hub

**Feature**: `006-design-sync-integration`  
**Spec**: `specs/006-design-sync-integration/spec.md`  
**Plan**: `specs/006-design-sync-integration/plan.md`

## Phase 1: Setup (Project Initialization)

- [ ] T001 Establish feature flag `DESIGN_SYNC_ENABLED` in `apps/api/src/config/flags.ts`
- [ ] T002 Add design sync navigation entry in `apps/web/app/layout.tsx`
- [ ] T003 Create placeholder feature route directory `apps/web/app/(design-sync)/page.tsx`
- [ ] T004 [P] Add environment variable validation for required credentials in `packages/utils/src/env/validateDesignSync.ts`
- [ ] T005 Upgrade Storybook to v10 in `apps/web/package.json` (dependency edits) and `apps/web/.storybook/main.ts`
- [ ] T006 [P] Document credential mapping in `specs/006-design-sync-integration/quickstart.md` (append section)
- [ ] T007 Add OpenAI usage flag `DESIGN_SYNC_RAG_EXPLAIN=false` in `apps/api/src/config/flags.ts`
- [ ] T008 [P] Register feature in internal registry `packages/types/src/features/index.ts`

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T009 Create DB migration file `apps/api/db/migrations/20251123_design_sync.sql`
- [ ] T010 [P] Implement Drizzle schema `apps/api/db/schema/designSync.ts`
- [ ] T011 [P] Add Zod schemas `packages/types/src/design-sync/syncOperation.ts`
- [ ] T012 [P] Add Zod schemas `packages/types/src/design-sync/drift.ts`
- [ ] T013 [P] Add Zod schemas `packages/types/src/design-sync/undo.ts`
- [ ] T014 [P] Add Zod schemas `packages/types/src/design-sync/coverage.ts`
- [ ] T015 [P] Add Zod schemas `packages/types/src/design-sync/credentials.ts`
- [ ] T016 [P] Add Zod schemas `packages/types/src/design-sync/browserSession.ts`
- [ ] T017 Create service skeleton `apps/api/src/services/designSyncService.ts`
- [ ] T018 [P] Create service skeleton `apps/api/src/services/designDriftService.ts`
- [ ] T019 [P] Create service skeleton `apps/api/src/services/designUndoService.ts`
- [ ] T020 [P] Create service skeleton `apps/api/src/services/designCoverageService.ts`
- [ ] T021 [P] Create service skeleton `apps/api/src/services/designCredentialService.ts`
- [ ] T022 [P] Create service skeleton `apps/api/src/services/browserTestService.ts`
- [ ] T023 Add route registration barrel `apps/api/src/routes/design-sync/index.ts`
- [ ] T024 Implement notification category registry `apps/api/src/services/notificationCategoryService.ts`
- [ ] T025 [P] Add MCP tool descriptor `mcp/servers/design-system/design.sync.json`
- [ ] T026 [P] Add MCP tool descriptor `mcp/servers/design-system/design.driftReport.json`
- [ ] T027 [P] Add MCP tool descriptor `mcp/servers/design-system/design.undo.json`
- [ ] T028 [P] Add MCP tool descriptor `mcp/servers/design-system/design.coverageReport.json`
- [ ] T029 [P] Add MCP tool descriptor `mcp/servers/design-system/design.browserTest.start.json`
- [ ] T030 [P] Add MCP tool descriptor `mcp/servers/design-system/design.browserTest.status.json`
- [ ] T031 Add API client resource `packages/api-client/src/resources/designSync.ts`
- [ ] T032 [P] Add API client resource `packages/api-client/src/resources/designDrift.ts`
- [ ] T033 [P] Add API client resource `packages/api-client/src/resources/designUndo.ts`
- [ ] T034 [P] Add API client resource `packages/api-client/src/resources/designCoverage.ts`
- [ ] T035 [P] Add API client resource `packages/api-client/src/resources/designCredentials.ts`
- [ ] T036 [P] Add API client resource `packages/api-client/src/resources/designBrowserSession.ts`
- [ ] T037 Insert OpenAPI endpoints into contract `specs/006-design-sync-integration/contracts/openapi.yaml`
- [ ] T038 Add feature-specific logging utilities `apps/api/src/logging/designSyncLogger.ts`
- [ ] T039 [P] Establish correlation ID middleware extension `apps/api/src/middleware/correlationDesignSync.ts`
- [ ] T040 Implement access control matrix `apps/api/src/middleware/designSyncAccess.ts`

## Phase 3: User Story 1 (P1) Manual Design↔Code Sync with Control

- [ ] T041 [US1] Implement diff canonicalizer util `apps/api/src/utils/designSync/canonicalize.ts`
- [ ] T042 [P] [US1] Implement drift detection algorithm `apps/api/src/utils/designSync/driftDetect.ts`
- [ ] T043 [US1] Implement sync execution core `apps/api/src/services/designSyncService.ts` (apply logic)
- [ ] T044 [P] [US1] Implement undo stack manager `apps/api/src/services/designUndoService.ts` (history window)
- [ ] T045 [US1] Implement POST /design-sync/operations route `apps/api/src/routes/design-sync/sync.ts`
- [ ] T046 [P] [US1] Implement GET /design-sync/drift route `apps/api/src/routes/design-sync/drift.ts`
- [ ] T047 [US1] Implement POST /design-sync/undo route `apps/api/src/routes/design-sync/undo.ts`
- [ ] T048 [P] [US1] Create UI diff preview component `apps/web/app/(design-sync)/components/DiffPreview.tsx`
- [ ] T049 [P] [US1] Create UI sync control panel `apps/web/app/(design-sync)/components/SyncControlPanel.tsx`
- [ ] T050 [US1] Add undo/redo buttons logic `apps/web/app/(design-sync)/components/SyncHistoryControls.tsx`
- [ ] T051 [US1] Add audit log entry creation `apps/api/src/services/designAuditService.ts`
- [ ] T052 [P] [US1] Add optimistic UI state & error boundary `apps/web/app/(design-sync)/components/SyncStateBoundary.tsx`
- [ ] T053 [US1] Integrate MCP tool design.sync invocation in UI `apps/web/app/(design-sync)/lib/mcpSyncInvoker.ts`
- [ ] T054 [US1] Unit tests for canonicalizer `apps/api/tests/designSync/canonicalize.test.ts`
- [ ] T055 [P] [US1] Unit tests for drift detection `apps/api/tests/designSync/driftDetect.test.ts`
- [ ] T056 [US1] Integration test: sync operation flow `apps/api/tests/designSync/syncFlow.test.ts`
- [ ] T057 [P] [US1] Integration test: undo / redo `apps/api/tests/designSync/undoRedo.test.ts`

## Phase 4: User Story 2 (P2) Integrated Multi-Tool Test & Documentation Coverage

- [ ] T058 [US2] Implement coverage calculation util `apps/api/src/utils/designSync/coverageCalc.ts`
- [ ] T059 [P] [US2] Implement coverage report route `apps/api/src/routes/design-sync/coverage.ts`
- [ ] T060 [US2] Implement test scaffold generator `apps/api/src/services/designCoverageService.ts` (extend)
- [ ] T061 [P] [US2] Add Storybook story auto-registration script `scripts/design/registerStories.ts`
- [ ] T062 [US2] Add Cypress scaffold template `apps/web/tests/designSync/cypressScaffold.spec.ts`
- [ ] T063 [P] [US2] Add Playwright scaffold template `apps/web/tests/designSync/playwrightScaffold.spec.ts`
- [ ] T064 [US2] Add accessibility test scaffold template `apps/web/tests/designSync/a11yScaffold.spec.ts`
- [ ] T065 [P] [US2] Create coverage dashboard UI `apps/web/app/(design-sync)/components/CoverageDashboard.tsx`
- [ ] T066 [US2] Slack (notification system) coverage summary dispatch `apps/api/src/services/notificationCategoryService.ts` (extend)
- [ ] T067 [US2] Integration test coverage endpoint `apps/api/tests/designSync/coverageEndpoint.test.ts`
- [ ] T068 [P] [US2] Unit tests coverageCalc util `apps/api/tests/designSync/coverageCalc.test.ts`

## Phase 5: User Story 3 (P3) Notification & Collaboration Hub

- [ ] T069 [US3] Implement category preference model extension `apps/api/db/schema/designSync.ts` (add table/fields)
- [ ] T070 [P] [US3] Implement preferences route `apps/api/src/routes/design-sync/preferences.ts`
- [ ] T071 [US3] Add digest generation job `apps/api/src/jobs/designSyncDigestJob.ts`
- [ ] T072 [P] [US3] Notification preferences UI `apps/web/app/(design-sync)/components/NotificationPreferences.tsx`
- [ ] T073 [US3] Daily digest dispatch integration `apps/api/src/services/notificationCategoryService.ts` (extend)
- [ ] T074 [P] [US3] Integration test digest job `apps/api/tests/designSync/digestJob.test.ts`
- [ ] T075 [US3] Unit tests preferences route `apps/api/tests/designSync/preferencesRoute.test.ts`

## Phase 6: User Story 4 (P4) Credential & Integration Governance

- [ ] T076 [US4] Implement credential status route GET `apps/api/src/routes/design-sync/credentials.ts`
- [ ] T077 [P] [US4] Implement credential action POST rotate/validate/revoke `apps/api/src/routes/design-sync/credentialsAction.ts`
- [ ] T078 [US4] Extend credential service logic `apps/api/src/services/designCredentialService.ts`
- [ ] T079 [P] [US4] Credential status UI card `apps/web/app/(design-sync)/components/CredentialStatusCard.tsx`
- [ ] T080 [US4] Integration tests credential actions `apps/api/tests/designSync/credentialActions.test.ts`
- [ ] T081 [P] [US4] Unit tests credential service `apps/api/tests/designSync/credentialService.test.ts`

## Phase 7: User Story 5 (P5) Browser Testing via MCP

- [ ] T082 [US5] Implement browser session start route `apps/api/src/routes/design-sync/browserSessionStart.ts`
- [ ] T083 [P] [US5] Implement browser session status route `apps/api/src/routes/design-sync/browserSessionStatus.ts`
- [ ] T084 [US5] Extend browser test service link to stories `apps/api/src/services/browserTestService.ts`
- [ ] T085 [P] [US5] Browser session viewer UI `apps/web/app/(design-sync)/components/BrowserSessionViewer.tsx`
- [ ] T086 [US5] Integration test browser session flow `apps/api/tests/designSync/browserSessionFlow.test.ts`
- [ ] T087 [P] [US5] Unit tests browserTestService `apps/api/tests/designSync/browserTestService.test.ts`

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T088 Add performance metrics instrumentation `apps/api/src/metrics/designSyncMetrics.ts`
- [ ] T089 [P] Add structured logging enrichment `apps/api/src/logging/designSyncLogger.ts` (extend)
- [ ] T090 Add drift false positive tracking metric `apps/api/src/services/designDriftService.ts` (extend)
- [ ] T091 [P] Add retry helper for notification dispatch `apps/api/src/utils/notificationRetry.ts`
- [ ] T092 Add pruning job for undo & coverage cache `apps/api/src/jobs/designSyncPruneJob.ts`
- [ ] T093 [P] Security review doc update `specs/006-design-sync-integration/research.md` (append security section)
- [ ] T094 Add RAG diff explanation placeholder endpoint `apps/api/src/routes/design-sync/diffExplain.ts`
- [ ] T095 [P] Implement OpenAI embedding util `apps/api/src/utils/designSync/embeddingExplain.ts`
- [ ] T096 Accessibility audit tasks update `scripts/design/a11yAuditTrigger.ts`
- [ ] T097 [P] E2E test scenario combining sync+coverage+browser `apps/api/tests/designSync/e2eFullFlow.test.ts`
- [ ] T098 Final documentation pass `specs/006-design-sync-integration/quickstart.md` (update flow diagrams)
- [ ] T099 [P] Update agent-copilot context with final tool examples `.specify/memory/agent-copilot.md`
- [ ] T100 Final spec traceability matrix `specs/006-design-sync-integration/spec.md` (append Traceability section)

## Dependency Graph (Story Order)
```
Setup -> Foundational -> US1 -> US2 -> US3 -> US4 -> US5 -> Polish
US1 unlocks diff & sync core required by coverage (US2) and notifications (US3).
US2 independent of credentials governance (US4) and browser session (US5).
US4 independent; can run parallel with US5 after Foundational but scheduled after US3 for governance clarity.
```

## Parallel Execution Examples
- US1: T042, T044, T046, T048, T049, T052, T055, T057 can run in parallel after T041.
- US2: T059, T061, T063, T065, T068 parallel after T058.
- US3: T070, T072, T074 parallel after T069.
- US4: T077, T079, T081 parallel after T076.
- US5: T083, T085, T087 parallel after T082.
- Polish: T089, T091, T093, T095, T097, T099 parallel after T088 & T090 base instrumentation.

## Independent Test Criteria per User Story
- US1: Single component sync with diff + undo restoring pre-state; audit log entry present.
- US2: Component shows 100% variant coverage post sync; scaffolds exist; coverage report accessible.
- US3: Preference toggle alters notification dispatch (disabled category suppressed in test scenario).
- US4: Revoking credential blocks sync attempt; rotation reinstates functionality.
- US5: Browser session passes auth flow and performance metrics recorded & linked to story.

## MVP Scope
MVP = Complete Phase 1, Phase 2, and Phase 3 (US1). Delivers core manual sync with diff + undo and audit logging.

## Task Counts
- Setup: 8
- Foundational: 32 (T009–T040)
- US1: 17 (T041–T057)
- US2: 11 (T058–T068)
- US3: 7 (T069–T075)
- US4: 6 (T076–T081)
- US5: 6 (T082–T087)
- Polish: 13 (T088–T100)
- TOTAL: 100

## Format Validation
All tasks include: checkbox, TaskID (T###), optional [P], optional [US#] for story phases, and explicit file path.

---
*End of tasks.md*
