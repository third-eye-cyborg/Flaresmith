---
description: "Task list for Platform Bootstrap feature implementation"
---

# Tasks: Platform Bootstrap

**Input**: Design documents from `/specs/001-platform-bootstrap/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Test tasks generated based on analysis findings (Session 2 2025-11-21)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure:
- Monorepo: `apps/web/`, `apps/mobile/`, `apps/api/`, `packages/`, `mcp/`, `specs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic monorepo structure

- [X] T001 Initialize monorepo with Turborepo and pnpm workspace (create root `package.json`, `turbo.json`, `pnpm-workspace.yaml`)
- [X] T002 [P] Create base tsconfig.json configurations in packages/config/tsconfig/
- [X] T003 [P] Setup ESLint and Prettier configurations in packages/config/eslint/
- [X] T004 [P] Configure NativeWind and Tailwind theme tokens in packages/config/tailwind/
- [X] T005 Create root package.json with workspace scripts (dev, build, lint, typecheck, test)
- [X] T006 Configure turbo.json with pipeline for build, dev, lint, typecheck, test tasks
- [X] T007 [P] Create packages/ui structure with base React Native primitives
- [X] T008 [P] Create packages/types structure for shared TypeScript types
- [X] T009 [P] Create packages/utils structure with hooks and helper functions
 - [X] T010 [P] Create packages/api-client structure with typed fetch wrapper (include Zod validation layer + retry/backoff integration points)
- [X] T011 Create devcontainer.json for Codespaces with Node 20.x tooling
- [X] T012 Create root README.md with overview and quickstart instructions
- [X] T013 [P] Create SECURITY.md documenting secrets policy and security practices
- [X] T014 [P] Create CONTRIBUTING.md with spec-first workflow guidelines

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T015 Setup Neon Postgres connection with serverless driver in apps/api/db/connection.ts
- [X] T016 Initialize Drizzle ORM configuration and migration system in apps/api/db/drizzle.config.ts
- [X] T017 Create base database schema for core entities in apps/api/db/schema/base.ts
- [X] T018 Implement BetterAuth authentication configuration in apps/api/auth/config.ts
- [X] T019 [P] Create Zod schema definitions for Project entity in packages/types/src/entities/project.ts
- [X] T020 [P] Create Zod schema definitions for Environment entity in packages/types/src/entities/environment.ts
- [X] T021 [P] Create Zod schema definitions for IntegrationConfig entity in packages/types/src/entities/integration.ts
- [X] T022 [P] Create Zod schema definitions for User and Organization entities in packages/types/src/entities/auth.ts
- [X] T023 Setup Hono app with middleware pipeline in apps/api/src/app.ts
- [X] T024 Implement structured logging with correlation IDs using Pino in apps/api/src/lib/logger.ts
- [X] T025 Create error handling middleware in apps/api/src/middleware/errorHandler.ts
- [X] T026 Implement role-based authorization middleware in apps/api/src/middleware/auth.ts
- [X] T027 Create idempotency tracking table schema in apps/api/db/schema/idempotency.ts
- [X] T028 Implement idempotency key validation service in apps/api/src/services/idempotency.ts
- [X] T029 Setup environment configuration management in packages/utils/src/env.ts
- [X] T030 Create OpenAPI spec generation setup in apps/api/src/openapi/setup.ts
- [X] T031 Initialize Next.js app structure with app router in apps/web/
- [X] T032 [P] Initialize Expo app structure with Expo Router in apps/mobile/
- [X] T033 Setup MCP config.json structure and server registry in mcp/config.json
- [X] T034 Create typed API client base with Zod validation in packages/api-client/src/client.ts
- [X] T035 Implement pre-commit hook for secret scanning with automated CI validation stage in .github/workflows/security.yml and scripts/security/scanSecrets.ts (addresses FR-013 security enforcement)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create Project (Priority: P1) 🎯 MVP

**Goal**: Enable users to create new projects with GitHub repo, Codespace, environments, Neon branches, Cloudflare resources, and Postman workspace provisioning

**Independent Test**: Invoke backend API POST /projects with required payload and verify: repo exists, spec files created, dev Codespace running, environment records persisted

### Implementation for User Story 1

- [X] T036 [P] [US1] Create Project Drizzle model schema in apps/api/db/schema/project.ts
- [X] T037 [P] [US1] Create Environment Drizzle model schema in apps/api/db/schema/environment.ts
- [X] T038 [P] [US1] Create IntegrationConfig Drizzle model schema in apps/api/db/schema/integration.ts
- [X] T039 [P] [US1] Create Deployment Drizzle model schema in apps/api/db/schema/deployment.ts
- [X] T040 [P] [US1] Define POST /projects request/response Zod schemas in packages/types/src/api/projects.ts
- [X] T041 [P] [US1] Define GET /projects/:id request/response Zod schemas in packages/types/src/api/projects.ts
- [X] T042 [US1] Implement GitHub integration service for repo creation in apps/api/src/integrations/github/repoService.ts
- [X] T043 [US1] Implement GitHub template monorepo cloning logic in apps/api/src/integrations/github/templateService.ts
- [X] T044 [US1] Implement GitHub Codespaces provisioning service in apps/api/src/integrations/github/codespaceService.ts
- [X] T045 [US1] Implement Neon integration service for project and branch creation in apps/api/src/integrations/neon/projectService.ts
- [X] T046 [US1] Implement Cloudflare Workers/Pages provisioning service in apps/api/src/integrations/cloudflare/deployService.ts
- [X] T047 [US1] Implement Postman workspace and collection creation service in apps/api/src/integrations/postman/workspaceService.ts
- [X] T048 [US1] Create ProjectService orchestrating all provisioning steps in apps/api/src/services/projectService.ts
- [X] T049 [US1] Implement POST /projects endpoint with validation and idempotency in apps/api/src/routes/projects/create.ts
- [X] T050 [US1] Implement GET /projects/:id endpoint in apps/api/src/routes/projects/get.ts
- [X] T051 [US1] Add project creation audit logging in apps/api/src/services/projectService.ts
- [X] T052 [US1] Create MCP tool descriptor for github.createRepo in mcp/servers/github/createRepo.json
- [X] T053 [P] [US1] Create MCP tool descriptor for neon.createBranch in mcp/servers/neon/createBranch.json
- [X] T054 [P] [US1] Create MCP tool descriptor for cloudflare.deployWorker in mcp/servers/cloudflare/deployWorker.json
- [X] T055 [P] [US1] Create MCP tool descriptor for postman.syncCollections in mcp/servers/postman/syncCollections.json
- [X] T056 [P] [US1] Create MCP tool descriptor for codespaces.create in mcp/servers/github/createCodespace.json
- [X] T057 [US1] Create project creation form UI component in apps/web/src/components/projects/CreateProjectForm.tsx
- [X] T058 [US1] Create project creation page with integration selection in apps/web/app/projects/new/page.tsx
- [X] T059 [US1] Implement typed API client methods for project creation in packages/api-client/src/resources/projects.ts
- [X] T060 [US1] Add CLI script for project provisioning in scripts/provision/createProject.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Environment Dashboard (Priority: P2)

**Goal**: Provide consolidated dashboard showing dev/staging/prod environment status across all integrations

**Independent Test**: With a project created, hitting GET /projects/{id}/environments returns matrix with fields populated; UI renders cards

### Implementation for User Story 2

- [X] T061 [P] [US2] Create Build Drizzle model schema in apps/api/db/schema/build.ts
- [X] T062 [P] [US2] Define GET /projects/:id/environments response Zod schema in packages/types/src/api/environments.ts
- [X] T063 [US2] Implement EnvironmentService for aggregating status across integrations in apps/api/src/services/environmentService.ts
- [X] T064 [US2] Create GitHub integration service for branch and environment status in apps/api/src/integrations/github/environmentService.ts
- [X] T065 [US2] Create Cloudflare integration service for deployment status queries in apps/api/src/integrations/cloudflare/statusService.ts
- [X] T066 [US2] Create Neon integration service for branch status queries in apps/api/src/integrations/neon/statusService.ts
- [X] T067 [US2] Create Postman integration service for environment status in apps/api/src/integrations/postman/environmentService.ts
- [X] T068 [US2] Implement GET /projects/:id/environments endpoint in apps/api/src/routes/projects/environments.ts
- [X] T069 [US2] Implement deployment history tracking in apps/api/src/services/deploymentService.ts
- [X] T070 [US2] Create promotion action endpoint POST /projects/:id/promote in apps/api/src/routes/projects/promote.ts
- [X] T071 [US2] Implement environment promotion logic (dev→staging, staging→prod) in apps/api/src/services/promotionService.ts
- [X] T072 [US2] Create EnvironmentCard UI component in packages/ui/src/EnvironmentCard.tsx
- [X] T073 [US2] Create EnvironmentDashboard UI component in apps/web/src/components/environments/EnvironmentDashboard.tsx
- [X] T074 [US2] Create environment dashboard page in apps/web/app/projects/[id]/environments/page.tsx
- [X] T075 [US2] Implement usePollingStatus hook for real-time updates in packages/utils/src/hooks/usePollingStatus.ts
- [X] T076 [US2] Add typed API client methods for environment queries in packages/api-client/src/resources/environments.ts
- [X] T077 [US2] Create mobile environment monitoring view in apps/mobile/app/environments/[projectId].tsx
- [X] T078 [US2] Setup deployment status push notifications via OneSignal in apps/mobile/src/services/notifications.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Spec-Driven Update & Sync (Priority: P3)

**Goal**: Enable spec file edits to automatically regenerate Zod schemas, Drizzle models, Hono routes, Postman collections, and MCP tool descriptors

**Independent Test**: Modify spec file adding endpoint definition; call POST /specs/apply; verify code + collection + MCP tool file created/updated

### Implementation for User Story 3

 - [X] T079 [P] [US3] Create SpecArtifact Drizzle model schema in apps/api/db/schema/specArtifact.ts
 - [X] T080 [P] [US3] Define POST /specs/apply request/response Zod schema in packages/types/src/api/specs.ts
 - [X] T081 [US3] Implement spec file parser for endpoint definitions in scripts/spec/parser.ts
 - [X] T082 [US3] Implement Zod schema code generator in scripts/spec/generators/zodSchemaGenerator.ts
 - [X] T083 [US3] Implement Drizzle model code generator in scripts/spec/generators/drizzleModelGenerator.ts
 - [X] T084 [US3] Implement Hono route stub generator in scripts/spec/generators/routeGenerator.ts
 - [X] T085 [US3] Implement Postman collection generator in scripts/spec/generators/postmanGenerator.ts
 - [X] T086 [US3] Implement MCP tool descriptor generator in scripts/spec/generators/mcpToolGenerator.ts
 - [X] T087 [US3] Implement AST-based drift detection for code artifacts in scripts/spec/driftDetector.ts
 - [X] T088 [US3] Create SpecApplyService orchestrating all generators in apps/api/src/services/specApplyService.ts
 - [X] T089 [US3] Implement POST /specs/apply endpoint in apps/api/src/routes/specs/apply.ts
 - [X] T090 [US3] Create MCP tool descriptor for specs.apply in mcp/servers/specs/apply.json
- [X] T091 [US3] Create spec file editor UI component with CodeMirror in apps/web/src/components/specs/SpecEditor.tsx
- [X] T092 [US3] Create spec sync trigger UI in apps/web/src/components/specs/SyncButton.tsx
- [X] T093 [US3] Create spec drift report viewer in apps/web/src/components/specs/DriftReport.tsx
- [X] T094 [US3] Add CLI script for spec apply in scripts/spec/apply.ts
- [X] T095 [US3] Add typed API client methods for spec operations in packages/api-client/src/resources/specs.ts

**Checkpoint**: All three core user stories should now be independently functional

---

## Phase 6: User Story 4 - Chat & Code Editor Integration (Priority: P4)

**Goal**: Provide in-browser code editor with AI chat that proposes spec-aware edits and commits to feature branches

**Independent Test**: Start chat session, submit prompt, receive response with proposed edits; apply edits triggers backend commit and returns commit SHA

### Implementation for User Story 4

- [ ] T096 [P] [US4] Create ChatSession Drizzle model schema in apps/api/db/schema/chatSession.ts
- [ ] T097 [P] [US4] Define WebSocket chat message Zod schemas in packages/types/src/api/chat.ts
- [ ] T098 [US4] Implement GitHub file tree fetching service in apps/api/src/integrations/github/fileService.ts
- [ ] T099 [US4] Implement GitHub file content fetching with range support in apps/api/src/integrations/github/fileService.ts
- [ ] T100 [US4] Implement GitHub commit creation service in apps/api/src/integrations/github/commitService.ts
- [ ] T101 [US4] Create Copilot CLI wrapper service for chat in apps/api/src/services/copilotService.ts
- [ ] T102 [US4] Implement spec-first context injection for chat prompts in apps/api/src/services/chatContextService.ts
- [ ] T103 [US4] Create WebSocket chat endpoint with streaming support in apps/api/src/routes/chat/stream.ts
- [ ] T104 [US4] Implement ChatService for session management in apps/api/src/services/chatService.ts
- [ ] T105 [US4] Create POST /chat/apply-diff endpoint for committing edits in apps/api/src/routes/chat/applyDiff.ts
- [ ] T106 [US4] Create MCP tool descriptor for chat.sendMessage in mcp/servers/chat/sendMessage.json
- [ ] T107 [US4] Implement CodeMirror editor component with lazy loading in apps/web/src/components/editor/CodeEditor.tsx
- [ ] T108 [US4] Implement file tree browser component in apps/web/src/components/editor/FileTree.tsx
- [ ] T109 [US4] Implement chat panel UI component in apps/web/src/components/chat/ChatPanel.tsx
- [ ] T110 [US4] Implement diff preview component in apps/web/src/components/chat/DiffPreview.tsx
- [ ] T111 [US4] Create integrated editor page with chat in apps/web/app/projects/[id]/editor/page.tsx
- [ ] T112 [US4] Implement WebSocket client with reconnection logic in packages/api-client/src/websocket.ts
- [ ] T113 [US4] Add typed API client methods for chat operations in packages/api-client/src/resources/chat.ts
- [ ] T114 [US4] Implement optimistic locking with commit SHA verification in apps/api/src/services/chatService.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T115 [P] Configure Cloudflare Workers deployment settings in apps/api/wrangler.toml
- [ ] T116 [P] Create GitHub Actions workflow for lint and typecheck in .github/workflows/ci-lint.yml
- [ ] T117 [P] Create GitHub Actions workflow for tests in .github/workflows/ci-test.yml
- [ ] T118 [P] Create GitHub Actions workflow for Postman collection testing in .github/workflows/ci-postman.yml
- [ ] T119 Create GitHub Actions workflow for staging deployment in .github/workflows/deploy-staging.yml
- [ ] T120 Create GitHub Actions workflow for production deployment in .github/workflows/deploy-prod.yml
- [ ] T121 [P] Implement deployment rollback functionality in apps/api/src/services/rollbackService.ts
- [ ] T122 [P] Add pagination support for GET /projects endpoint in apps/api/src/routes/projects/list.ts
- [ ] T123 [P] Implement branch-based preview URL generation in apps/api/src/services/previewService.ts
- [ ] T124 [P] Add spec versioning tracking in apps/api/db/schema/specVersion.ts
- [ ] T125 [P] Create MCP tool sync script in scripts/mcp/syncTools.ts
- [ ] T126 Implement PostHog analytics integration in packages/utils/src/analytics.ts
- [ ] T127 Add comprehensive error messages and user feedback across all endpoints in apps/api/src/middleware/errorHandler.ts
- [ ] T128 Performance optimization: implement caching for environment status queries in apps/api/src/services/environmentService.ts
- [ ] T129 Security hardening: validate all external API responses in apps/api/src/integrations/common/validateResponse.ts
- [ ] T130 [P] Update documentation in README.md with complete feature overview
- [ ] T131 Run quickstart.md validation and update with accurate commands
- [ ] T132 [P] Implement performance & reliability test suite validating SC-001 through SC-010 (provisioning, dashboard latency, spec apply time, retry convergence, chat diff latency, secret scan zero findings, uptime simulation, circuit breaker efficacy, rate limit behavior) using Vitest in apps/api/tests/performance/ (addresses coverage gap C4)
- [ ] T133 [P] Create Postman test collection with assertions for critical endpoints in postman/tests/integration.postman_collection.json (addresses coverage gap C5)
- [ ] T134 [P] Implement spec versioning metadata in SpecArtifact entity referencing Constitution version (addresses FR-027 and coverage gap C6)
- [ ] T135 Implement PATCH /projects/{id}/integrations endpoint for partial integration updates in apps/api/src/routes/projects/updateIntegrations.ts (addresses FR-022 and coverage gap C7)
- [ ] T136 [P] Define drift report response schema in packages/types/src/api/specs.ts with fields: changedFiles[], conflicts[], summary (addresses underspecification U1)
 - [ ] T137 [P] Implement health check scheduler (30s interval) and failover logic (Neon standby branch promotion) in apps/api/src/services/healthCheckService.ts (FR-031)
 - [ ] T138 [P] Implement retry/backoff + circuit breaker module in packages/utils/src/reliability/externalPolicy.ts (FR-032)
 - [ ] T139 [P] Implement rate limiting middleware (token buckets) in apps/api/src/middleware/rateLimit.ts with headers & endpoint weights (FR-033)
 - [ ] T140 [P] Surface circuit breaker state & remaining rate limit tokens in GET /projects/:id/environments response (extend service + update openapi) (FR-032, FR-033)
 - [ ] T141 [P] Extend OpenAPI spec (`contracts/openapi.yaml`) to include environment matrix schema reference in FR-007 and rate limit headers for relevant endpoints (addresses U2)
 - [ ] T142 [P] Implement spec apply conflict detection for uncommitted changes in scripts/spec/driftDetector.ts (Edge Case resolution A5)
 - [ ] T143 [P] Add secrets mapping overview endpoint GET /projects/:id/secrets in apps/api/src/routes/projects/secrets.ts (FR-023 explicit coverage)
 - [ ] T144 [P] Add reliability metrics emission (rate_limit_hits, circuit_breaker_open_total, health_check_failures) in apps/api/src/lib/metrics.ts and integrate into services (FR-031, FR-032, FR-033)
 - [ ] T145 [P] Implement telemetry base module (OpenTelemetry setup & OTLP exporter) in apps/api/src/lib/telemetry.ts (FR-035)
 - [ ] T146 [P] Implement trace context propagation middleware in apps/api/src/middleware/traceContext.ts (FR-035)
 - [ ] T147 [P] Instrument core services (projectService, environmentService, specApplyService) with spans in apps/api/src/services/ (FR-035)
 - [ ] T148 [P] Implement metrics catalog (counters/histograms/gauges) in apps/api/src/lib/metricsCatalog.ts (FR-035)
 - [ ] T149 [P] Implement sampling & forced error/slow sampling logic in apps/api/src/middleware/errorHandler.ts (FR-035)
 - [ ] T150 [P] Extend error envelope middleware to include traceId/requestId mapping in apps/api/src/middleware/errorHandler.ts (FR-035)
 - [ ] T151 [P] Add pgcrypto migration for secrets metadata encryption in apps/api/db/migrations/001_add_secrets_encryption.sql (FR-036)
 - [ ] T152 [P] Create Drizzle schema for encrypted secrets metadata in apps/api/db/schema/secrets.ts (FR-036)
 - [ ] T153 [P] Implement secret audit logging service in apps/api/src/services/secretAuditService.ts (FR-036)
 - [ ] T154 [P] Implement JWT key rotation job script in scripts/security/rotateJwtKey.ts and JWKS manifest endpoint in apps/api/src/routes/auth/jwks.ts (FR-036)
 - [ ] T155 [P] Implement master encryption key rotation job in scripts/security/rotateMasterKey.ts (FR-036)
 - [ ] T156 [P] Emit security metrics (key_rotation_total, secret_access_total) in apps/api/src/lib/metrics.ts (FR-036)
 - [ ] T157 [P] Extend OpenAPI spec contracts/openapi.yaml with error envelope schema & rate limit + trace headers (FR-035, FR-033)
 - [ ] T158 [P] Implement logger redaction denylist scanner in apps/api/src/lib/loggerRedaction.ts (FR-036)
 - [ ] T159 [P] Implement JWKS manifest generation service in apps/api/src/services/jwksService.ts (FR-036)
 - [ ] T160 [P] Enforce preview environment cap (≤15) in apps/api/src/services/previewService.ts (Data Scale & Limits)
 - [ ] T161 [P] Implement archival job for expired preview environments in scripts/preview/archiveExpiredPreviews.ts (Data Scale & Limits)
 - [ ] T162 [P] Implement preview environment metrics updater (preview_env_active_total gauge) in apps/api/src/services/previewMetricsUpdater.ts (FR-035)

  # Added Test & Coverage Enhancement Tasks (Refinements 2025-11-21)
  # All new tasks address previously identified gaps (SC-011, redaction, TTL expiry, state machine, rate limit overhead, promotion lineage, drift/audit schemas)
 - [ ] T163 [P] Implement SC-011 key rotation compliance test suite in apps/api/tests/security/keyRotation.test.ts
 - [ ] T164 [P] Implement logger redaction & secret leakage prevention tests in apps/api/tests/security/redaction.test.ts
 - [ ] T165 [P] Implement preview environment TTL expiry & archival tests in apps/api/tests/environments/previewTtl.test.ts
 - [ ] T166 [P] Implement environment state machine transition tests (pending→provisioning→active etc.) in apps/api/tests/environments/stateMachine.test.ts
 - [ ] T167 [P] Implement rate limit overhead latency histogram & test (<5ms p95) in apps/api/tests/performance/rateLimitLatency.test.ts
 - [ ] T168 [P] Add promotion lineage visualization component in apps/web/src/components/environments/PromotionHistory.tsx
 - [ ] T169 [P] Add drift report schema validation tests (FR-010) in apps/api/tests/spec/driftReportSchema.test.ts
 - [ ] T170 [P] Add secret audit record schema validation tests (FR-036) in apps/api/tests/security/secretAuditSchema.test.ts

  # Additional Test Tasks from Analysis (Session 2 2025-11-21)
  # These tasks address coverage gaps identified during specification analysis
 - [ ] T171 [P] Implement rollback integration test (FR-016) validating deployment rollback flows in apps/api/tests/integration/rollback.test.ts
 - [ ] T172 [P] Implement circuit breaker half-open transition test (FR-032) verifying open→half-open→closed cycle in apps/api/tests/reliability/circuitBreakerTransitions.test.ts
 - [ ] T173 [P] Implement idempotency convergence test (FR-021) asserting repeat POST /projects with same key returns existing resource in apps/api/tests/integration/idempotency.test.ts
 - [ ] T174 [P] Implement pagination correctness test (FR-025) validating opaque cursor behavior and hasMore logic in apps/api/tests/integration/pagination.test.ts
 - [ ] T175 [P] Implement Postman hybrid collection validation test (FR-029) verifying base + environment collections with variable linkage in apps/api/tests/integration/postmanStructure.test.ts
 - [ ] T176 [P] Implement preview environment cap enforcement test (FR-034) verifying 15-env limit and 409 ENV_PREVIEW_LIMIT_REACHED response in apps/api/tests/environments/previewCap.test.ts
 - [ ] T177 [P] Implement audit functional operations test (FR-036) verifying audit log entries on secret read/update/rotate actions in apps/api/tests/security/auditOperations.test.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Requires US1 for project existence, but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Can work with mock projects, independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Can work with mock projects, independently testable

### Within Each User Story

- Models before services
- Services before endpoints
- Core implementation before UI components
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: Can run T002-T004, T007-T010, T013-T014 in parallel (11 tasks)

**Phase 2 (Foundational)**: Can run T019-T022, T032 in parallel (5 tasks)

**User Story 1**: Can run T036-T041, T053-T056 in parallel (11 tasks)

**User Story 2**: Can run T061-T062 in parallel (2 tasks)

**User Story 3**: Can run T079-T080 in parallel (2 tasks)

**User Story 4**: Can run T096-T097 in parallel (2 tasks)

**Phase 7 (Polish)**: Broad parallelization: T115–T118, T121–T125, T130, T132–T136, T137–T144, T145–T162 (39 tasks total; all marked [P])

**Cross-Story Parallelism**: Once Phase 2 completes, all four user stories (Phase 3-6) can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all model schemas together:
Task T036: "Create Project Drizzle model schema in apps/api/db/schema/project.ts"
Task T037: "Create Environment Drizzle model schema in apps/api/db/schema/environment.ts"
Task T038: "Create IntegrationConfig Drizzle model schema in apps/api/db/schema/integration.ts"
Task T039: "Create Deployment Drizzle model schema in apps/api/db/schema/deployment.ts"

# Launch all Zod API schemas together:
Task T040: "Define POST /projects request/response Zod schemas"
Task T041: "Define GET /projects/:id request/response Zod schemas"

# Launch all MCP tool descriptors together:
Task T053: "Create MCP tool descriptor for neon.createBranch"
Task T054: "Create MCP tool descriptor for cloudflare.deployWorker"
Task T055: "Create MCP tool descriptor for postman.syncCollections"
Task T056: "Create MCP tool descriptor for codespaces.create"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (14 tasks)
2. Complete Phase 2: Foundational (21 tasks) - CRITICAL GATE
3. Complete Phase 3: User Story 1 (25 tasks)
4. **STOP and VALIDATE**: Test User Story 1 independently - can create projects end-to-end
5. Deploy/demo if ready

**MVP Task Count**: 60 tasks (Setup + Foundational + US1)

### Incremental Delivery

1. Complete Setup + Foundational (35 tasks) → Foundation ready
2. Add User Story 1 (25 tasks) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (18 tasks) → Test independently → Deploy/Demo (Environment visibility)
4. Add User Story 3 (17 tasks) → Test independently → Deploy/Demo (Spec automation)
5. Add User Story 4 (19 tasks) → Test independently → Deploy/Demo (Full AI workflow)
6. Add Polish (17 tasks) → Production hardening

Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (35 tasks)
2. Once Foundational is done:
   - Developer A: User Story 1 (25 tasks)
   - Developer B: User Story 2 (18 tasks)
   - Developer C: User Story 3 (17 tasks)
   - Developer D: User Story 4 (19 tasks)
3. Stories complete and integrate independently
4. Team converges for Polish phase (22 tasks)

---

## Summary Statistics

 - **Total Tasks**: 167 (added T163–T170 coverage tasks + T171–T177 analysis-identified test tasks; telemetry & security rotation included; duplicate FR-020 resolved)
 - **Setup Phase**: 13 tasks (duplicate T010 removed)
- **Foundational Phase**: 21 tasks (BLOCKS all stories)
- **User Story 1 (P1)**: 25 tasks
- **User Story 2 (P2)**: 18 tasks
- **User Story 3 (P3)**: 17 tasks
- **User Story 4 (P4)**: 19 tasks
 - **Polish Phase**: 54 tasks (T145–T162 base + T163–T170 coverage + T171–T177 analysis tests)

 - **Parallel Opportunities Identified**: 68 tasks marked [P] across all phases (includes all test & coverage tasks T163–T177)
 - **MVP Scope (US1 only)**: 59 tasks (unchanged; new tasks are polish/test additions post-user stories)
- **Cross-Story Parallel Potential**: 4 user stories can proceed simultaneously after Foundational

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story (US1-US4) for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Tests were NOT generated (not explicitly requested in specification)
 - Test & coverage tasks (T132, T163–T177) added during planning to address SC-001..SC-011 validation, security compliance (key rotation, redaction, audit operations), reliability verification (circuit breaker, idempotency, rollback), and API contract validation (pagination, Postman structure, preview cap enforcement)
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
