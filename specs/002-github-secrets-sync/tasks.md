# Tasks: GitHub Secrets Synchronization & Environment Configuration

**Feature Branch**: `002-github-secrets-sync`  
**Input**: Design documents from `/specs/002-github-secrets-sync/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create database schema file at apps/api/db/schema/secretSync.ts with all entities from data-model.md
- [X] T002 [P] Create Zod schemas for secret sync at packages/types/src/github/secretSync.ts
- [X] T003 [P] Create Zod schemas for environments at packages/types/src/github/environments.ts
- [X] T004 [P] Create Zod schemas for validation at packages/types/src/github/validation.ts
- [X] T005 Create database migration 002-001 at apps/api/db/migrations/002-001-create-secret-sync-tables.sql
- [X] T006 Run database migration to create tables (secret_mappings, github_environment_configs, secret_sync_events, secret_exclusion_patterns, github_api_quotas)
- [X] T007 Seed global exclusion patterns in secret_exclusion_patterns table (GITHUB_TOKEN, ACTIONS_*, RUNNER_*, CI, etc.)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Create GitHub client wrapper at apps/api/src/integrations/github/client.ts with Octokit initialization and authentication
- [X] T009 [P] Implement secret encryption helper at apps/api/src/integrations/github/encryption.ts using sodium.seal() with repo public key caching (5min TTL)
- [X] T010 [P] Implement secret redaction middleware at apps/api/src/middleware/secretRedaction.ts with regex patterns for API keys, tokens, connection strings
- [X] T011 [P] Create base service class at apps/api/src/services/github/baseGitHubService.ts with retry logic (exponential backoff, max 3 attempts, jitter)
- [X] T012 Implement GitHub API quota service at apps/api/src/services/github/quotaService.ts with methods: checkQuota(), updateQuota(), blockIfInsufficient()
- [X] T013 Create audit service at apps/api/src/services/github/auditService.ts with method logSecretSyncEvent() to insert into secret_sync_events table
- [X] T014 Add secret redaction middleware to Hono middleware pipeline in apps/api/src/app.ts before all routes

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automated Secret Distribution (Priority: P1) 🎯 MVP

**Goal**: Developers store secrets once in GitHub Actions, system automatically copies to Codespaces and Dependabot scopes, eliminating manual duplication

**Independent Test**: Add a secret to GitHub Actions repository secrets and verify it appears in Codespaces and Dependabot scopes within 5 minutes

### Implementation for User Story 1

- [X] T015 [P] [US1] Create SecretMapping Drizzle model in apps/api/db/schema/secretSync.ts with all fields and indexes from data-model.md (COMPLETED in Phase 1)
- [X] T016 [P] [US1] Create SecretExclusionPattern Drizzle model in apps/api/db/schema/secretSync.ts with unique constraints and global pattern logic (COMPLETED in Phase 1)
- [X] T017 [P] [US1] Create SecretSyncEvent Drizzle model in apps/api/db/schema/secretSync.ts with partitioning setup and CHECK constraints (COMPLETED in Phase 1)
- [X] T018 [US1] Implement secret sync service at apps/api/src/services/github/secretSyncService.ts with methods: syncSecret(), syncAllSecrets(), isExcluded(), computeValueHash() + BONUS: Cloudflare integration via writeToCloudflare()
- [X] T019 [US1] Implement secret fetching logic in secretSyncService.ts: getActionsSecrets() using GitHub API GET /repos/{owner}/{repo}/actions/secrets
- [X] T020 [US1] Implement secret writing logic in secretSyncService.ts: writeToCodespaces(), writeToDependabot() using PUT endpoints with encrypted values + BONUS: writeToCloudflare() for Workers/Pages
- [X] T021 [US1] Add conflict handling in secretSyncService.ts: compareHashes(), detectConflicts(), overwriteOnForce()
- [X] T022 [US1] Implement exclusion pattern matching in secretSyncService.ts: matchesExclusionPattern() with regex evaluation against database patterns
- [X] T023 [US1] Create POST /github/secrets/sync route at apps/api/src/routes/github/syncSecrets.ts with request validation using SecretSyncRequestSchema
- [X] T024 [US1] Implement sync endpoint handler in syncSecrets.ts: extract projectId, call secretSyncService.syncAllSecrets(), return SecretSyncResponse
- [X] T025 [US1] Add error handling in syncSecrets.ts for rate limits (GITHUB_SECRETS_RATE_LIMIT_EXHAUSTED), encryption failures, partial failures
- [X] T026 [US1] Create GET /github/secrets/sync/status route at apps/api/src/routes/github/getSecretSyncStatus.ts with query param validation
- [X] T027 [US1] Implement status endpoint handler in getSecretSyncStatus.ts: query secret_mappings table, aggregate status counts, fetch quota from quotaService
- [X] T028 [US1] Add scheduled sync job at scripts/github/syncSecretsScheduled.ts with Cloudflare Workers cron trigger (0 */6 * * *) to run sync for all active projects
- [X] T029 [US1] Update API client at packages/api-client/src/resources/github.ts with methods: syncSecrets(), getSecretSyncStatus()
- [X] T030 [US1] Add logging for all sync operations in secretSyncService.ts with correlation IDs, duration tracking, success/failure counts (COMPLETED - integrated into service)

**Checkpoint**: At this point, User Story 1 should be fully functional - secrets can be synced manually via API and automatically every 6 hours ✅ COMPLETE

---

## Phase 4: User Story 2 - Environment-Specific Configuration (Priority: P2)

**Goal**: Developers provision projects and system automatically creates three GitHub environments (dev/staging/production) with environment-specific secrets pointing to isolated Cloudflare and Neon resources

**Independent Test**: Trigger project provisioning and verify 3 GitHub environments are created with correct secrets (NEON_BRANCH_ID, CLOUDFLARE_WORKER_NAME) pointing to isolated resources

### Implementation for User Story 2

- [X] T031 [P] [US2] Create GitHubEnvironmentConfig Drizzle model in apps/api/db/schema/secretSync.ts with JSONB fields for protectionRules, secrets, linkedResources (COMPLETED in Phase 1)
- [X] T032 [P] [US2] Extend existing Environment entity with fields: githubEnvironmentId (integer), secretsLastSyncedAt (datetime), syncStatus (enum)
- [X] T033 [US2] Implement environment service at apps/api/src/services/github/environmentService.ts with methods: createEnvironment(), applyProtectionRules(), setEnvironmentSecrets()
- [X] T034 [US2] Add GitHub API integration in environmentService.ts: createGitHubEnvironment() using PUT /repos/{owner}/{repo}/environments/{environment_name}
- [X] T035 [US2] Implement protection rules logic in environmentService.ts: setReviewers(), setWaitTimer(), setBranchRestrictions() according to tiered structure (dev=none, staging=1 reviewer, prod=1 reviewer+main branch)
- [X] T036 [US2] Implement environment secret management in environmentService.ts: writeEnvironmentSecret() using PUT /repos/{owner}/{repo}/environments/{env}/secrets/{name}
- [X] T037 [US2] Add linked resource validation in environmentService.ts: validateNeonBranchId(), validateCloudflareWorkerName() to ensure resources exist before linking
- [X] T038 [US2] Create POST /github/environments route at apps/api/src/routes/github/createEnvironments.ts with request validation using CreateEnvironmentsRequestSchema
- [X] T039 [US2] Implement environment creation endpoint handler in createEnvironments.ts: iterate over environments array, call environmentService.createEnvironment() for each
- [X] T040 [US2] Add idempotency handling in createEnvironments.ts: check if environment exists, update if present (return in 'updated' array), create if not (return in 'created' array)
- [X] T041 [US2] Add error handling in createEnvironments.ts for reviewer not found (GITHUB_ENV_REVIEWER_NOT_FOUND), protection rule conflicts, API failures
- [ ] T042 [US2] Integrate environment creation into project provisioning workflow at apps/api/src/services/provision/projectProvisioningService.ts: call createEnvironments after GitHub repo creation
-  [X] T043 [US2] Update API client at packages/api-client/src/resources/github.ts with method: createEnvironments()
- [X] T044 [US2] Add audit logging for environment operations in environmentService.ts with operation type (create|update), environment names, reviewer IDs

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - secrets sync automatically AND environments are provisioned during project setup ✅ MOSTLY COMPLETE (T042 pending - requires projectProvisioningService implementation)

---

## Phase 5: User Story 3 - Secret Validation & Conflict Detection (Priority: P3)

**Goal**: Developers receive automated validation that all required secrets are present across scopes and are notified of conflicts before deployment

**Independent Test**: Create missing or conflicting secrets and verify validation report identifies issues with specific remediation guidance

### Implementation for User Story 3

- [ ] T045 [P] [US3] Implement secret validation service at apps/api/src/services/github/secretValidationService.ts with methods: validateSecrets(), findMissingSecrets(), detectConflicts(), generateRemediationSteps()
- [ ] T046 [US3] Add secret retrieval logic in secretValidationService.ts: getSecretsFromScope() to fetch secrets from Actions, Codespaces, Dependabot using GitHub API GET endpoints
- [ ] T047 [US3] Implement missing secret detection in secretValidationService.ts: compareRequiredVsActual() to identify secrets in Actions but not in target scopes
- [ ] T048 [US3] Implement conflict detection in secretValidationService.ts: compareValueHashes() using SHA-256 hashes from secret_mappings table
- [ ] T049 [US3] Add remediation step generation in secretValidationService.ts: buildRemediationSteps() with actionable guidance (e.g., "Run sync command", "Add missing secret X to scope Y")
- [ ] T050 [US3] Create POST /github/secrets/validate route at apps/api/src/routes/github/validateSecrets.ts with request validation using SecretValidationRequestSchema
- [ ] T051 [US3] Implement validation endpoint handler in validateSecrets.ts: call secretValidationService.validateSecrets(), build SecretValidationResponse with summary counts
- [ ] T052 [US3] Add validation caching in validateSecrets.ts: cache results for 5 minutes to reduce repeated API calls during rapid validation checks
- [ ] T053 [US3] Integrate validation into pre-deployment checks in apps/api/src/services/deployment/deploymentService.ts: call validateSecrets() before allowing deployment to staging/prod
- [ ] T054 [US3] Update API client at packages/api-client/src/resources/github.ts with method: validateSecrets()
- [ ] T055 [US3] Add dashboard integration in apps/web/src/components/projects/SecretValidationPanel.tsx to display validation results with color-coded status (green=valid, yellow=conflicts, red=missing)

**Checkpoint**: All user stories should now be independently functional - secrets sync, environments provision, and validation detects issues

---

## Phase 6: MCP Tools & AI Integration

**Purpose**: Enable AI agents to invoke secret sync operations via MCP protocol

- [ ] T056 [P] Create MCP tool descriptor at mcp/servers/github/syncSecrets.json with inputSchema referencing SecretSyncRequest and outputSchema referencing SecretSyncResponse
- [ ] T057 [P] Create MCP tool descriptor at mcp/servers/github/createEnvironments.json with inputSchema referencing CreateEnvironmentsRequest and outputSchema referencing CreateEnvironmentsResponse
- [ ] T058 [P] Create MCP tool descriptor at mcp/servers/github/validateSecrets.json with inputSchema referencing SecretValidationRequest and outputSchema referencing SecretValidationResponse
- [ ] T059 [P] Create MCP tool descriptor at mcp/servers/github/getSecretSyncStatus.json with inputSchema for projectId query param and outputSchema referencing SecretSyncStatusResponse
- [ ] T060 Update MCP config at mcp/config.json to register all four GitHub secret management tools
- [ ] T061 Test MCP tools using MCP inspector or CLI to verify input/output schema validation and endpoint invocation

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T062 [P] Create API documentation at specs/002-github-secrets-sync/API.md with examples for all four endpoints (sync, status, environments, validate)
- [ ] T063 [P] Add performance monitoring in secretSyncService.ts: track sync duration, API call counts, quota consumption per operation
- [ ] T064 [P] Implement Postman collection at postman/tests/github-secrets.postman_collection.json with contract tests for all endpoints
- [ ] T065 Create integration tests at apps/api/tests/integration/github/secretSync.test.ts using Vitest and GitHub API mocking (nock or msw)
- [ ] T066 [P] Add unit tests for encryption logic at apps/api/tests/unit/github/encryption.test.ts verifying sodium.seal() behavior and public key caching
- [ ] T067 [P] Add unit tests for exclusion pattern matching at apps/api/tests/unit/github/secretSync.test.ts with various regex patterns
- [ ] T068 [P] Add unit tests for retry logic at apps/api/tests/unit/github/baseGitHubService.test.ts verifying exponential backoff and jitter
- [ ] T069 Add error taxonomy documentation at apps/api/src/types/errors.ts with all GITHUB_SECRETS_* and GITHUB_ENV_* error codes from data-model.md
- [ ] T070 Update agent context at .github/agents/copilot-instructions.md with GitHub Secrets API usage patterns and troubleshooting guidance (ALREADY COMPLETED in plan phase)
- [ ] T071 Run quickstart validation per specs/002-github-secrets-sync/quickstart.md to verify all documented workflows function correctly
- [ ] T072 Add metrics dashboard integration in apps/web/src/components/projects/SecretSyncMetrics.tsx showing sync success rate, average duration, pending counts
- [ ] T073 Implement audit log viewer in apps/web/app/projects/[id]/audit/page.tsx with filtering by operation type, date range, actor

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) completion - Can start in parallel with US1
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) completion - Can start in parallel with US1 and US2
- **MCP Tools (Phase 6)**: Depends on User Story 1, 2, and 3 implementations (requires API endpoints to exist)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - **MVP SCOPE**
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 (uses secretSyncService for environment secrets) but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Integrates with US1 (reads secret_mappings table) but independently testable

### Within Each Phase

**Setup Phase (Phase 1)**:
- T001 must complete before T005 (migration depends on schema file)
- T002, T003, T004 can run in parallel (different files)
- T005 must complete before T006 (migration file before execution)
- T006 must complete before T007 (tables must exist before seeding)

**Foundational Phase (Phase 2)**:
- T008 must complete before T009, T011, T012, T013 (client wrapper is dependency for all services)
- T009, T010, T011 can run in parallel (different files, no dependencies)
- T012 depends on T011 (quota service extends base service)
- T013 can run in parallel with T009, T010, T011, T012
- T014 depends on T010 (middleware must exist before adding to pipeline)

**User Story 1 (Phase 3)**:
- T015, T016, T017 can run in parallel (different Drizzle models)
- T018 depends on T015, T016, T017 (service uses models)
- T019, T020, T021, T022 all depend on T018 (methods added to secretSyncService)
- T023 depends on T018-T022 (route calls service methods)
- T024, T025 depend on T023 (handler logic in same file)
- T026, T027 can run in parallel with T023-T025 (different route file)
- T028, T029, T030 can run in parallel after T018-T027 complete (independent extensions)

**User Story 2 (Phase 4)**:
- T031, T032 can run in parallel (different model files)
- T033 depends on T031, T032 (service uses models)
- T034, T035, T036, T037 all depend on T033 (methods added to environmentService)
- T038 depends on T033-T037 (route calls service methods)
- T039, T040, T041 depend on T038 (handler logic in same file)
- T042, T043, T044 can run in parallel after T033-T041 complete (independent integrations)

**User Story 3 (Phase 5)**:
- T045, T046, T047, T048, T049 are sequential (methods build on each other in secretValidationService)
- T050 depends on T045-T049 (route calls service methods)
- T051, T052 depend on T050 (handler logic in same file)
- T053, T054, T055 can run in parallel after T050-T052 complete (independent integrations)

**MCP Tools (Phase 6)**:
- T056, T057, T058, T059 can all run in parallel (different tool descriptors)
- T060 depends on T056-T059 (config references all tools)
- T061 depends on T060 (testing requires config)

**Polish (Phase 7)**:
- T062, T063, T064, T066, T067, T068 can all run in parallel (different files)
- T065 can run in parallel with T062-T064, T066-T068
- T069, T070 can run in parallel with all other polish tasks
- T071 depends on all implementation tasks (validates complete feature)
- T072, T073 can run in parallel after T071

### Parallel Opportunities

**Maximum Parallelization Strategy** (with sufficient team capacity):

1. **Phase 1**: Run T002, T003, T004 in parallel → then T001, T005, T006, T007 sequentially
2. **Phase 2**: Run T009, T010, T011 in parallel → then T012, T013 → then T014
3. **After Phase 2**: Run ALL THREE user stories in parallel:
   - Developer A: User Story 1 (T015-T030)
   - Developer B: User Story 2 (T031-T044)
   - Developer C: User Story 3 (T045-T055)
4. **Phase 6**: Run T056-T059 in parallel → then T060 → then T061
5. **Phase 7**: Run T062-T070 in parallel → then T071 → then T072-T073 in parallel

---

## Parallel Example: User Story 1

```bash
# After Foundational phase complete, launch User Story 1:

# Step 1: Create all models in parallel
Task: "Create SecretMapping Drizzle model in apps/api/db/schema/secretSync.ts"
Task: "Create SecretExclusionPattern Drizzle model in apps/api/db/schema/secretSync.ts"
Task: "Create SecretSyncEvent Drizzle model in apps/api/db/schema/secretSync.ts"

# Step 2: Implement service (depends on models)
Task: "Implement secret sync service at apps/api/src/services/github/secretSyncService.ts"

# Step 3: Add service methods in sequence (build on each other)
Task: "Implement secret fetching logic in secretSyncService.ts: getActionsSecrets()"
Task: "Implement secret writing logic in secretSyncService.ts: writeToCodespaces(), writeToDependabot()"
Task: "Add conflict handling in secretSyncService.ts: compareHashes(), detectConflicts()"
Task: "Implement exclusion pattern matching in secretSyncService.ts"

# Step 4: Create routes in parallel
Task: "Create POST /github/secrets/sync route at apps/api/src/routes/github/syncSecrets.ts"
Task: "Create GET /github/secrets/sync/status route at apps/api/src/routes/github/getSecretSyncStatus.ts"

# Step 5: Add integrations in parallel
Task: "Add scheduled sync job at scripts/github/syncSecretsScheduled.ts"
Task: "Update API client at packages/api-client/src/resources/github.ts"
Task: "Add logging for all sync operations in secretSyncService.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (database schema, Zod schemas, migrations)
2. Complete Phase 2: Foundational (GitHub client, encryption, retry logic, quota, audit, middleware)
3. Complete Phase 3: User Story 1 (secret sync service, sync endpoint, status endpoint, scheduled job)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Add secret to GitHub Actions
   - Verify it syncs to Codespaces and Dependabot within 5 minutes
   - Check audit logs for successful sync event
   - Verify excluded secrets (GITHUB_TOKEN) are skipped
5. Deploy MVP to staging for team testing

### Incremental Delivery

1. **Foundation Ready** (Phases 1-2): Database schema, GitHub client, foundational services
2. **MVP** (Phase 3): Automated secret distribution - Deploy and demo ✅
3. **Environment Management** (Phase 4): Add environment provisioning - Test independently - Deploy/Demo
4. **Validation** (Phase 5): Add conflict detection - Test independently - Deploy/Demo
5. **AI Integration** (Phase 6): Add MCP tools for AI agents
6. **Complete** (Phase 7): Polish, documentation, tests, metrics dashboard

### Parallel Team Strategy

With 3 developers after Foundational phase complete:

1. **Team completes Setup + Foundational together** (Phases 1-2)
2. **Once Foundational is done**:
   - **Developer A**: User Story 1 (T015-T030) - Secret sync MVP
   - **Developer B**: User Story 2 (T031-T044) - Environment provisioning
   - **Developer C**: User Story 3 (T045-T055) - Validation
3. **Stories complete independently** and can be deployed/tested separately
4. **Team reconvenes** for MCP tools (Phase 6) and polish (Phase 7)

---

## Success Validation Checklist

After completing all tasks, verify these success criteria from spec.md:

- [ ] **SC-001**: Provision new project with all secrets synchronized across scopes within 10 minutes
- [ ] **SC-002**: Secret synchronization operations complete with 99% success rate
- [ ] **SC-003**: Deploy to dev environment immediately after provisioning without additional secret configuration
- [ ] **SC-004**: Staging and production deployments blocked until manual approval granted
- [ ] **SC-005**: Validation reports identify 100% of missing or conflicting secrets
- [ ] **SC-006**: Secret management time reduced by 80% (from ~15 min manual to ~3 min automated)
- [ ] **SC-007**: Zero secret values appear in logs or error messages (100% redaction compliance)
- [ ] **SC-008**: Clear error messages with remediation steps when sync fails
- [ ] **SC-009**: All three GitHub environments accessible within 5 minutes of provisioning
- [ ] **SC-010**: Environment-specific deployments use correct isolated resources

---

## Notes

- **[P] tasks** = different files, no dependencies - can run in parallel
- **[Story] label** = maps task to specific user story for traceability
- Each user story should be **independently completable and testable**
- Commit after each task or logical group of tasks
- Stop at each **Checkpoint** to validate story works independently
- Use correlation IDs in all logs for cross-system tracing
- Never log secret values - only names, scopes, hashes, timestamps
- All GitHub API calls must respect rate limits (check quota before bulk operations)
- Environment protection rules enforce approval workflow (dev=none, staging=1 reviewer, prod=1 reviewer+main branch)
- Secret sync is **idempotent** - repeated calls converge to same state without errors

---

## Total Task Count

- **Setup**: 7 tasks
- **Foundational**: 7 tasks (CRITICAL - blocks all stories)
- **User Story 1** (P1 - MVP): 16 tasks
- **User Story 2** (P2): 14 tasks
- **User Story 3** (P3): 11 tasks
- **MCP Tools**: 6 tasks
- **Polish**: 12 tasks

**Grand Total**: 73 tasks

**Parallel Opportunities**:
- Setup phase: 3 tasks can run in parallel (T002, T003, T004)
- Foundational phase: 4 tasks can run in parallel (T009, T010, T011, T013)
- After Foundational: ALL 3 user stories can run in parallel (41 tasks total across stories)
- MCP phase: 4 tasks can run in parallel (T056, T057, T058, T059)
- Polish phase: 10 tasks can run in parallel (T062-T070)

**MVP Scope**: Phases 1-3 (Setup + Foundational + User Story 1) = **30 tasks**

**Independent Test Criteria**:
- User Story 1: Add secret to Actions → verify in Codespaces/Dependabot within 5 min
- User Story 2: Provision project → verify 3 environments created with correct secrets
- User Story 3: Create missing/conflicting secrets → verify validation report identifies issues
