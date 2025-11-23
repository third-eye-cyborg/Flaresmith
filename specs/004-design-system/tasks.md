# Tasks: Unified Cross-Platform Design System

**Feature Branch**: `004-design-system`  
**Input**: Design documents from `/specs/004-design-system/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are NOT explicitly requested in the feature specification. Focus on implementation with manual validation per quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, database schema, base token definitions

- [X] T001 Create database schema file at apps/api/db/schema/designSystem.ts with all entities from data-model.md (design_tokens, design_token_versions, design_overrides, design_accessibility_audits, design_drift_events)
- [X] T002 [P] Export Zod schemas from packages/types/src/designSystem.ts (already created in Phase 0; verify completeness)
- [X] T003 [P] Create initial base token definitions at packages/config/tailwind/tokens.base.json with color/spacing/typography/radius/elevation/glass/semantic categories (~100 tokens)
- [X] T004 Create database migration 004-001 at apps/api/db/migrations/004-001-create-design-system-tables.sql
 - [X] T005 Run database migration to create tables with indexes per data-model.md indexing strategy
 - [X] T006 Seed initial token version (v1) in design_token_versions table from tokens.base.json with SHA-256 hash

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Implement token hashing utility at packages/utils/src/designSystem/hashTokens.ts with normalizeTokenSet() and computeSHA256Hash() functions (Decision D-001)
- [X] T008 [P] Implement Liquidglass capability detection at packages/utils/src/designSystem/capabilityDetection.ts with detectBackdropFilter() (web) and detectBlurSupport() (mobile) per Decision D-002
- [X] T009 [P] Implement accessibility contrast calculator at packages/utils/src/designSystem/contrastAudit.ts with OKLCH-based luminance calculation and validateContrastRatio() per Decision D-003
- [X] T010 [P] Implement drift detection algorithm at packages/utils/src/designSystem/driftDetector.ts with category-grouped diff logic per Decision D-004 and data-model.md
- [X] T011 [P] Implement token merge utility at packages/utils/src/designSystem/mergeTokens.ts with layered precedence (base → semantic → mode → override → preview) per Decision D-005
- [X] T012 Create base service class at apps/api/src/services/designSystem/baseDesignSystemService.ts with retry logic and audit logging
- [X] T013 Implement circular reference detector at packages/utils/src/designSystem/circularDetector.ts using DFS algorithm per Decision D-009
- [X] T014 Create audit service at apps/api/src/services/designSystem/auditService.ts with methods to log design.* events per data-model.md
- [X] T015 Add token redaction patterns to existing middleware at apps/api/src/middleware/secretRedaction.ts (extend for sensitive color tokens if flagged)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Core Token Unification (Priority: P1) 🎯 MVP

**Goal**: Platform maintainers define design tokens once and consume them consistently in web (Tailwind), mobile (NativeWind), and shared UI primitives without duplication

**Independent Test**: Update a primary color token; verify web button, mobile button, and shared primitive reflect change after a single build across dev environment

### Implementation for User Story 1

- [X] T016 [P] [US1] Create DesignToken Drizzle model in apps/api/db/schema/designSystem.ts with uuid PK, name unique index, category, value jsonb, version, accessibility_meta (VERIFY from Phase 1 T001)
- [X] T017 [P] [US1] Create DesignTokenVersionSnapshot Drizzle model in apps/api/db/schema/designSystem.ts with hash unique index (VERIFY from Phase 1 T001)
- [X] T018 [US1] Implement token service at apps/api/src/services/designSystem/tokenService.ts with methods: getTokens(), getTokensByCategory(), getTokenVersion(), createTokenVersion()
- [X] T019 [US1] Implement token generation script at scripts/design/generateTokenConfigs.ts to read from design_tokens table, normalize, and output to packages/config/tailwind/tokens.generated.ts
- [X] T020 [US1] Extend Tailwind config at packages/config/tailwind/tailwind.config.js to import and merge tokens.generated.ts into theme.extend
- [X] T021 [US1] Create NativeWind token adapter at packages/config/tailwind/nativewind.generated.ts to transform Tailwind tokens into NativeWind-compatible format
- [X] T022 [US1] Create GET /design/tokens route at apps/api/src/routes/designSystem/getTokens.ts with query param validation (category, version) using GetTokensRequest schema
- [X] T023 [US1] Implement getTokens endpoint handler in getTokens.ts: call tokenService.getTokens(), return GetTokensResponse with current version and token array
- [X] T024 [US1] Add token change propagation to build pipeline: update pnpm dev and pnpm build scripts to invoke generateTokenConfigs.ts before compilation
 - [X] T025 [US1] Create shared Button primitive at packages/ui/src/Button.tsx using semantic.primary and spacing tokens (no hard-coded values)
 - [X] T026 [US1] Create web Button component at apps/web/src/components/Button.tsx extending packages/ui Button with Tailwind classes from tokens
 - [X] T027 [US1] Create mobile Button component at apps/mobile/src/components/Button.tsx extending packages/ui Button with NativeWind styles from tokens
 - [X] T028 [US1] Update API client at packages/api-client/src/resources/designSystem.ts with method: getTokens()
 - [X] T029 [US1] Add token update snapshot test script at scripts/design/validateTokenParity.ts to compare web vs mobile rendered semantic colors (SC-001 validation)
 - [X] T030 [US1] Add logging for token retrieval operations in tokenService.ts with correlationId, version, category filter

**Checkpoint**: At this point, User Story 1 should be fully functional - tokens centralized, configs generated, primitives consume tokens, no duplicated values ✅

---

## Phase 4: User Story 2 - Component Library Integration (Priority: P2)

**Goal**: shadcn-derived component patterns (web) and NativeWind-based primitives (mobile) align to unified prop and variant model; component theming uses tokens and optionally Liquidglass variants

**Independent Test**: Implement a Card component variant ("elevated" vs "glass") in web and mobile using the same variant enum and tokens; verify props validated by shared Zod schema

### Implementation for User Story 2

 - [X] T031 [P] [US2] Create ComponentVariant Drizzle model in apps/api/db/schema/designSystem.ts with component, variant, tokens_used jsonb, accessibility_status (VERIFY from Phase 1 T001)
 - [X] T032 [P] [US2] Define CardVariant Zod schema in packages/types/src/designSystem.ts with enum ["elevated", "glass", "flat"] and shared props (variant, tokens)
 - [X] T033 [P] [US2] Define BadgeVariant Zod schema in packages/types/src/designSystem.ts with enum ["default", "outline", "subtle"]
 - [X] T034 [US2] Implement component variant service at apps/api/src/services/designSystem/componentVariantService.ts with methods: getVariants(), createVariant(), updateAccessibilityStatus()
 - [X] T035 [US2] Create shared Card primitive at packages/ui/src/Card.tsx with variant prop validated by CardVariant schema
 - [X] T036 [US2] Implement Liquidglass variant logic in Card.tsx: apply glass tokens (blur, opacity, saturation) when variant="glass" with capability detection fallback
 - [X] T037 [US2] Create web Card component at apps/web/src/components/Card.tsx extending packages/ui Card with Tailwind backdrop-filter classes for glass variant
 - [X] T038 [US2] Create mobile Card component at apps/mobile/src/components/Card.tsx extending packages/ui Card with React Native BlurView for glass variant (with fallback to solid + elevation)
 - [X] T039 [US2] Create shared Badge primitive at packages/ui/src/Badge.tsx with variant prop validated by BadgeVariant schema using semantic tokens
 - [X] T040 [US2] Create web Badge component at apps/web/src/components/Badge.tsx extending packages/ui Badge with Tailwind classes
 - [X] T041 [US2] Create mobile Badge component at apps/mobile/src/components/Badge.tsx extending packages/ui Badge with NativeWind styles
 - [X] T042 [US2] Register Card and Badge variants in database via seed script at scripts/design/seedComponentVariants.ts with tokens_used arrays
 - [X] T043 [US2] Create GET /design/components/variants route at apps/api/src/routes/designSystem/getComponentVariants.ts to list registered variants
 - [X] T044 [US2] Update API client at packages/api-client/src/resources/designSystem.ts with method: getComponentVariants()
 - [X] T045 [US2] Add Liquidglass fallback metrics tracking in capabilityDetection.ts to measure graceful degradation success rate (SC-007 validation)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - tokens unified AND components share variant model with Liquidglass support

---

## Phase 5: User Story 3 - User-Extensible Theming (Priority: P3)

**Goal**: Project owners can define custom theme overrides (subset of tokens) per environment (dev/staging/prod) with safe fallbacks and validation

**Independent Test**: Create an override file specifying new accent color for a user app in staging; verify only accent-dependent components change and logs show validated, merged token set

### Implementation for User Story 3

- [X] T046 [P] [US3] Create ThemeOverride Drizzle model in apps/api/db/schema/designSystem.ts with status state machine fields (submitted, auto-applied, pending-approval, approved, rejected) (VERIFY from Phase 1 T001)
 - [X] T047 [US3] Implement override validation service at apps/api/src/services/designSystem/overrideValidationService.ts with methods: validateOverride(), checkCircularReferences(), validateColorFormat(), computeOverrideSize()
 - [X] T048 [US3] Implement override size policy logic in overrideValidationService.ts: calculate size_pct, determine requires_approval flag per FR-024 (≤5% auto, 5-10% approval, >10% reject)
 - [X] T049 [US3] Implement rate limiting service at apps/api/src/services/designSystem/overrideRateLimitService.ts with methods: checkRateLimit() enforcing FR-025 (20/day standard, 40/day premium, 5/hour burst)
- [X] T050 [US3] Implement override application service at apps/api/src/services/designSystem/overrideService.ts with methods: submitOverride(), approveOverride(), applyOverride(), mergeWithBaseTokens()
- [X] T051 [US3] Implement override workflow state machine in overrideService.ts per data-model.md (submitted → auto-applied OR pending-approval → approved → auto-applied)
- [X] T052 [US3] Create POST /design/overrides route at apps/api/src/routes/designSystem/submitOverride.ts with request validation using ApplyOverrideRequest schema
- [X] T053 [US3] Implement submitOverride endpoint handler: validate override, check rate limit, compute size, create ThemeOverride record, auto-apply if ≤5%, return ApplyOverrideResponse
- [X] T054 [US3] Create GET /design/overrides/:id route at apps/api/src/routes/designSystem/getOverride.ts to retrieve override status and diff
- [X] T055 [US3] Implement override approval endpoint at apps/api/src/routes/designSystem/approveOverride.ts (PATCH /design/overrides/:id/approve) with permission check (platformOwner or designDelegate)
- [X] T056 [US3] Add override application to token generation script at scripts/design/generateTokenConfigs.ts: query active overrides per environment, merge via mergeTokens utility
- [X] T057 [US3] Update API client at packages/api-client/src/resources/designSystem.ts with methods: submitOverride(), getOverride(), approveOverride()
- [X] T058 [US3] Add override submission audit logging in overrideService.ts with event design.override.submitted including submitter, environment, size_pct, diff summary hash
- [X] T059 [US3] Create override validation error codes at apps/api/src/types/errors.ts: DESIGN_OVERRIDE_TOO_LARGE, DESIGN_OVERRIDE_RATE_LIMIT, DESIGN_OVERRIDE_CIRCULAR_REFERENCE, DESIGN_OVERRIDE_INVALID_COLOR
- [X] T060 [US3] Add environment parity validation in overrideService.ts: block promotion (staging→prod) if active override has status pending-approval per FR-021

**Checkpoint**: All user stories should now be independently functional - tokens unified, components integrated, overrides validated and applied per environment

---

## Phase 6: Accessibility Audits & Drift Detection

**Purpose**: Enable accessibility compliance validation and spec/implementation drift detection (cross-cutting concerns for all stories)

- [X] T061 [P] Create AccessibilityAuditResult Drizzle model in apps/api/db/schema/designSystem.ts (VERIFY from Phase 1 T001)
- [X] T062 [P] Create DesignDriftEvent Drizzle model in apps/api/db/schema/designSystem.ts (VERIFY from Phase 1 T001)
- [X] T063 Implement accessibility audit service at apps/api/src/services/designSystem/accessibilityAuditService.ts with methods: runAudit(), auditTokenPair(), generateAuditReport()
- [X] T064 Implement audit contrast evaluation in accessibilityAuditService.ts: iterate over semantic text/background token pairs, compute OKLCH contrast ratio, validate against WCAG AA thresholds (4.5:1 normal, 3:1 large)
- [X] T065 Create POST /design/audits/run route at apps/api/src/routes/designSystem/runAccessibilityAudit.ts with request validation using RunAccessibilityAuditRequest schema
- [X] T066 Implement runAccessibilityAudit endpoint handler: trigger async audit job, return RunAccessibilityAuditResponse with auditId and status "started"
- [X] T067 Create GET /design/audits/latest route at apps/api/src/routes/designSystem/getLatestAudit.ts with query param mode (light|dark)
- [X] T068 Implement getLatestAudit endpoint handler: query design_accessibility_audits table, return GetLatestAuditResponse with full report and passed_pct
- [X] T069 Implement drift detection service at apps/api/src/services/designSystem/driftDetectionService.ts with methods: detectDrift(), compareWithBaseline(), categorizeDiff()
- [X] T070 Create GET /design/drift route at apps/api/src/routes/designSystem/detectDrift.ts to check current tokens against baseline version
- [X] T071 Implement detectDrift endpoint handler: load baseline snapshot, hash current tokens, compute category-grouped diff, return DetectDriftResponse
- [X] T072 Add drift blocking logic to CI pipeline: invoke GET /design/drift before merge, fail if hasDrift=true per SC-008
- [X] T073 Update API client at packages/api-client/src/resources/designSystem.ts with methods: runAccessibilityAudit(), getLatestAudit(), detectDrift()
- [X] T074 Add accessibility audit logging in accessibilityAuditService.ts with event design.accessibility.audit.completed including version, mode, passed_pct

**Checkpoint**: Accessibility audits and drift detection available for all token changes

---

## Phase 7: Token Versioning & Rollback

**Purpose**: Enable version snapshots and rollback to previous token states (SC-010)

- [X] T075 Implement token rollback service at apps/api/src/services/designSystem/rollbackService.ts with methods: rollbackToVersion(), createSnapshotFromVersion(), validateRollbackPermissions()
- [X] T076 Implement rollback permission check in rollbackService.ts: only platformOwner or designDelegate can rollback prod environment per quickstart.md
- [X] T077 Create POST /design/rollback route at apps/api/src/routes/designSystem/rollbackTokens.ts with request validation using RollbackRequest schema
- [X] T078 Implement rollbackTokens endpoint handler: validate permissions, load target version snapshot, create new version entry, update active tokens, return RollbackResponse with previousVersion, newVersion, hash, durationMs
- [X] T079 Add rollback completion time tracking in rollbackService.ts to validate SC-010 (≤60s target)
- [X] T080 Update API client at packages/api-client/src/resources/designSystem.ts with method: rollbackTokens()
- [X] T081 Add rollback audit logging in rollbackService.ts with event design.tokens.rollback.completed including actor, targetVersion, newVersion, rationale

**Checkpoint**: Token rollback functional with version history

---

## Phase 8: MCP Tools & AI Integration

**Purpose**: Enable AI agents to invoke design system operations via MCP protocol

- [X] T082 [P] Verify MCP tool descriptor at mcp/servers/design-system/getTokens.json references GetTokensRequest/Response schemas (CREATED in Phase 0)
- [X] T083 [P] Verify MCP tool descriptor at mcp/servers/design-system/applyOverride.json references ApplyOverrideRequest/Response schemas (CREATED in Phase 0)
- [X] T084 [P] Verify MCP tool descriptor at mcp/servers/design-system/rollbackTokens.json references RollbackRequest/Response schemas (CREATED in Phase 0)
- [X] T085 [P] Verify MCP tool descriptor at mcp/servers/design-system/detectDrift.json references DetectDriftResponse schema (CREATED in Phase 0)
- [X] T086 [P] Verify MCP tool descriptor at mcp/servers/design-system/auditAccessibility.json references RunAccessibilityAuditRequest/Response schemas (CREATED in Phase 0)
- [X] T087 [P] Verify MCP tool descriptor at mcp/servers/design-system/getLatestAudit.json references GetLatestAuditRequest/Response schemas (CREATED in Phase 0)
- [X] T088 Update MCP config at mcp/config.json to register all six design-system tools
- [X] T089 Test MCP tools using MCP inspector or scripts/mcp/syncTools.ts to verify input/output schema validation and endpoint invocation

---

## Phase 9: Lint Rules & Migration

**Purpose**: Enforce token usage discipline and migrate legacy inline styles (FR-018, FR-020)

- [ ] T090 [P] Create ESLint plugin at packages/config/eslint/eslint-plugin-design-tokens/index.js with rule no-inline-styles to detect style literals in TSX/JSX
- [ ] T091 [P] Create ESLint rule no-reserved-namespaces in eslint-plugin-design-tokens to enforce FR-020 reserved namespaces (accent, primary, glass, elevation, semantic.*)
- [ ] T092 Implement fixer for no-inline-styles rule to suggest token replacements based on color/spacing/typography mappings
- [ ] T093 Add eslint-plugin-design-tokens to workspace ESLint config at packages/config/eslint/.eslintrc.js with rules enabled
- [ ] T094 Create migration script at scripts/design/migrateInlineStyles.ts to scan codebase, detect inline styles, generate auto-fix suggestions
- [ ] T095 Run migration script across apps/web and apps/mobile to measure SC-005 baseline (duplicated style literal count before)
- [ ] T096 Document token naming conventions in specs/004-design-system/TOKEN_NAMING.md with regex patterns and examples per FR-020

---

## Phase 10: Dark/Light Mode & Preview Mode

**Purpose**: Support theme mode switching and experimental token layers (FR-017, FR-019)

- [ ] T097 [P] Create dark mode token layer at packages/config/tailwind/tokens.dark.json with mode-specific semantic overrides
- [ ] T098 [P] Create light mode token layer at packages/config/tailwind/tokens.light.json (default base)
- [ ] T099 Extend token merge utility at packages/utils/src/designSystem/mergeTokens.ts to apply mode layer based on theme preference (light/dark)
- [ ] T100 Add theme mode selector to apps/web layout at apps/web/app/layout.tsx using next-themes package
- [ ] T101 Add theme mode selector to apps/mobile root at apps/mobile/app/_layout.tsx using React Context
- [ ] T102 Implement mode switch latency tracking in apps/web and apps/mobile to measure SC-006 (≤100ms web, ≤150ms mobile)
- [ ] T103 Create experimental preview token layer at packages/config/tailwind/tokens.preview.json for design.preview mode (FR-019)
- [ ] T104 Add preview mode toggle to token generation script at scripts/design/generateTokenConfigs.ts: inject preview layer when DESIGN_PREVIEW=true environment variable set
- [ ] T105 Document preview mode workflow in quickstart.md: how to enable, test, and disable experimental tokens

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, performance optimization, metrics dashboard

- [ ] T106 [P] Create comprehensive API documentation at specs/004-design-system/API.md with examples for all endpoints (tokens, overrides, audits, drift, rollback)
- [ ] T107 [P] Add performance monitoring in tokenService.ts: track token generation duration, API call counts, cache hit rates
- [ ] T108 [P] Add performance monitoring in accessibilityAuditService.ts: track audit duration per mode (target ≤5s per quickstart.md)
- [ ] T109 [P] Implement bundle size analyzer script at scripts/design/analyzeBundleSize.ts to measure SC-009 (override impact ≤10% web, ≤5% mobile)
- [ ] T110 Create design system metrics dashboard at apps/web/app/design/metrics/page.tsx displaying: token version history, override approval queue, accessibility audit results, drift events
- [ ] T111 Add token propagation time tracking to CI pipeline: measure commit timestamp to build completion (target ≤5 min per SC-002)
- [ ] T112 Update quickstart.md with complete workflow examples: add token, apply override, run audit, detect drift, rollback (validate all commands work)
- [ ] T113 Create design system README at specs/004-design-system/README.md with feature overview, architecture diagram, quick links
- [ ] T114 Add error taxonomy documentation at apps/api/src/types/errors.ts with all DESIGN_* error codes from data-model.md and FR requirements
- [ ] T115 Update agent context at .github/copilot-instructions.md with design system usage patterns, token naming conventions, override workflow guidance
- [ ] T116 Run complete feature validation per quickstart.md: execute all workflow steps, verify success criteria SC-001 through SC-010
- [ ] T117 Create design system component showcase at apps/web/app/design/showcase/page.tsx demonstrating all primitives (Button, Card, Badge, Input, Modal) in light/dark/glass variants

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) + User Story 1 token generation (T019-T024) - Can partially parallel with US1
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) + User Story 1 token service (T018) - Can partially parallel with US1
- **Accessibility & Drift (Phase 6)**: Depends on Foundational (Phase 2) + User Story 1 tokens - Can parallel with US2/US3
- **Versioning & Rollback (Phase 7)**: Depends on Foundational (Phase 2) + User Story 1 token versions - Can parallel with US2/US3
- **MCP Tools (Phase 8)**: Depends on all API endpoints (Phases 3-7) - Run after core implementation
- **Lint Rules (Phase 9)**: Depends on token generation (US1) - Can parallel with US2/US3
- **Mode & Preview (Phase 10)**: Depends on token merge utility (Phase 2) and generation (US1) - Can parallel with US2/US3
- **Polish (Phase 11)**: Depends on all features complete - Final phase

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories - **MVP SCOPE**
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) + partial US1 (tokens must be available) - Integrates with US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) + partial US1 (token service must exist) - Integrates with US1 but independently testable

### Within Each Phase

**Setup Phase (Phase 1)**:
- T001 must complete before T004 (schema before migration)
- T002, T003 can run in parallel (different files)
- T004 must complete before T005 (migration file before execution)
- T005 must complete before T006 (tables before seeding)

**Foundational Phase (Phase 2)**:
- T007-T011, T013 can all run in parallel (different utility files)
- T012, T014 can run in parallel (different service files)
- T015 depends on existing middleware (extend only)

**User Story 1 (Phase 3)**:
- T016, T017 verify Phase 1 models (no work if T001 complete)
- T018 depends on T016, T017 (service uses models)
- T019-T021 depend on T018 (generation uses service)
- T022, T023 depend on T018 (route uses service)
- T024 depends on T019-T021 (build pipeline uses scripts)
- T025-T027 can run in parallel (different component files)
- T028, T029, T030 can run in parallel (independent extensions)

**User Story 2 (Phase 4)**:
- T031 verifies Phase 1 model (no work if T001 complete)
- T032, T033 can run in parallel (different schema files)
- T034 depends on T031 (service uses model)
- T035-T041 sequential (build on each other)
- T042-T045 can run in parallel (independent tasks)

**User Story 3 (Phase 5)**:
- T046 verifies Phase 1 model (no work if T001 complete)
- T047-T051 sequential (services build on each other)
- T052-T055 depend on T047-T051 (routes use services)
- T056-T060 can run in parallel (independent extensions)

**Accessibility & Drift (Phase 6)**:
- T061, T062 verify Phase 1 models
- T063-T068 sequential for accessibility
- T069-T074 sequential for drift detection

**Versioning & Rollback (Phase 7)**:
- T075-T081 sequential (build on each other)

**MCP Tools (Phase 8)**:
- T082-T087 can all run in parallel (verify descriptors)
- T088, T089 sequential (config then test)

**Lint Rules (Phase 9)**:
- T090-T092 sequential (plugin then rules then fixer)
- T093-T096 can run in parallel after T090-T092

**Mode & Preview (Phase 10)**:
- T097, T098, T103 can run in parallel (different token layer files)
- T099-T105 sequential (build on merge utility)

**Polish (Phase 11)**:
- T106-T109 can all run in parallel
- T110-T117 can run in parallel after implementation complete

### Parallel Opportunities

**Maximum Parallelization Strategy** (with sufficient team capacity):

1. **Phase 1**: Run T002, T003 in parallel → then T001, T004, T005, T006 sequentially
2. **Phase 2**: Run T007-T011, T013, T012, T014 in parallel → then T015
3. **After Phase 2**: Stagger user stories with partial dependencies:
   - **Developer A**: User Story 1 (T016-T030) - Start immediately
   - **Developer B**: Wait for T018-T024 complete, then User Story 2 (T031-T045)
   - **Developer C**: Wait for T018 complete, then User Story 3 (T046-T060)
   - **Developer D**: Wait for T018 complete, then Accessibility/Drift (T061-T074)
4. **Phase 8**: Run T082-T087 in parallel → then T088 → then T089
5. **Phase 9**: Run T090-T092 → then T093-T096 in parallel
6. **Phase 10**: Run T097, T098, T103 in parallel → then T099-T105
7. **Phase 11**: Run T106-T117 in parallel

---

## Parallel Example: User Story 1

```bash
# After Foundational phase complete, launch User Story 1:

# Step 1: Verify models (likely already done in Phase 1)
Task: "Verify DesignToken Drizzle model exists"
Task: "Verify DesignTokenVersionSnapshot model exists"

# Step 2: Implement service
Task: "Implement token service at apps/api/src/services/designSystem/tokenService.ts"

# Step 3: Create generation pipeline (depends on service)
Task: "Implement token generation script at scripts/design/generateTokenConfigs.ts"
Task: "Extend Tailwind config to import tokens.generated.ts"
Task: "Create NativeWind token adapter"

# Step 4: Create API route (depends on service)
Task: "Create GET /design/tokens route"
Task: "Implement getTokens endpoint handler"

# Step 5: Update build pipeline (depends on generation script)
Task: "Add token change propagation to pnpm dev/build scripts"

# Step 6: Create components in parallel
Task: "Create shared Button primitive at packages/ui/src/Button.tsx"
Task: "Create web Button at apps/web/src/components/Button.tsx"
Task: "Create mobile Button at apps/mobile/src/components/Button.tsx"

# Step 7: Add extensions in parallel
Task: "Update API client with getTokens()"
Task: "Add token update snapshot test script"
Task: "Add logging for token operations"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (database schema, base tokens, migrations)
2. Complete Phase 2: Foundational (utilities, services, detection, audit)
3. Complete Phase 3: User Story 1 (token service, generation, API, primitives)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Update primary.500 token in database
   - Run token generation script
   - Build web and mobile apps
   - Verify Button components reflect change
   - Check no hard-coded color values
5. Deploy MVP to staging for team testing

### Incremental Delivery

1. **Foundation Ready** (Phases 1-2): Database, utilities, base services ✅
2. **MVP** (Phase 3): Core token unification - Deploy and demo ✅
3. **Component Integration** (Phase 4): Add component variants with Liquidglass - Test independently - Deploy/Demo
4. **User Extensibility** (Phase 5): Add override workflow - Test independently - Deploy/Demo
5. **Quality Gates** (Phases 6-7): Add audits, drift detection, rollback
6. **AI Integration** (Phase 8): Add MCP tools for AI agents
7. **Developer Experience** (Phases 9-10): Lint rules, migration, mode switching
8. **Complete** (Phase 11): Polish, documentation, metrics dashboard

### Parallel Team Strategy

With 4 developers after Foundational phase complete:

1. **Team completes Setup + Foundational together** (Phases 1-2)
2. **Once Foundational is done**:
   - **Developer A**: User Story 1 (T016-T030) - Token unification MVP (starts immediately)
   - **Developer B**: Wait for T018-T024, then User Story 2 (T031-T045) - Component integration
   - **Developer C**: Wait for T018, then User Story 3 (T046-T060) - Override workflow
   - **Developer D**: Wait for T018, then Accessibility/Drift (T061-T074) - Quality gates
3. **Stories complete with dependencies managed** and can be tested/deployed in sequence
4. **Team reconvenes** for MCP tools (Phase 8), lint rules (Phase 9), mode switching (Phase 10), and polish (Phase 11)

---

## Success Validation Checklist

After completing all tasks, verify these success criteria from spec.md:

- [ ] **SC-001**: ≥95% of core components render identical semantic color meaning across web/mobile (run snapshot diff script T029)
- [ ] **SC-002**: Token update propagation ≤5 minutes CI (measure via T111 tracking)
- [ ] **SC-003**: Accessibility audit passes AA for ≥98% text/background pairs (check audit report from T068)
- [ ] **SC-004**: Override validation rejects 100% malformed/circular references (test override submission with bad data)
- [ ] **SC-005**: ≥90% reduction in duplicated style literals (measure before/after T095 migration)
- [ ] **SC-006**: Dark/light mode switch latency ≤100ms web, ≤150ms mobile (measure via T102 tracking)
- [ ] **SC-007**: Liquidglass fallback success ≥99% (check fallback metrics T045)
- [ ] **SC-008**: Drift detector blocks 100% merges with config divergence (test T072 CI integration)
- [ ] **SC-009**: Overrides introduce ≤10% bundle increase web, ≤5% mobile (measure via T109 analyzer)
- [ ] **SC-010**: Token rollback completes ≤60s (measure via T079 duration tracking)

---

## Notes

- **[P] tasks** = different files, no dependencies - can run in parallel
- **[Story] label** = maps task to specific user story for traceability
- Each user story should be **independently completable and testable**
- Commit after each task or logical group of tasks
- Stop at each **Checkpoint** to validate story works independently
- Use correlation IDs in all logs for cross-system tracing
- Never log raw token values if flagged sensitive - only names, categories, hashes, timestamps
- All override operations are **idempotent** - repeated calls converge to same state
- Token generation is **deterministic** - same input produces same SHA-256 hash
- Override size policy enforced: ≤5% auto, 5-10% approval, >10% reject
- Rate limits: Standard 20/day + 5/hour burst, Premium 40/day + 5/hour burst
- Environment parity: invalid overrides block promotion staging→prod
- Accessibility thresholds: WCAG AA (4.5:1 normal text, 3:1 large text)
- Liquidglass fallback: capability detection → blur/opacity OR solid + elevation

---

## Total Task Count

- **Setup**: 6 tasks
- **Foundational**: 9 tasks (CRITICAL - blocks all stories)
- **User Story 1** (P1 - MVP): 15 tasks
- **User Story 2** (P2): 15 tasks
- **User Story 3** (P3): 15 tasks
- **Accessibility & Drift**: 14 tasks
- **Versioning & Rollback**: 7 tasks
- **MCP Tools**: 8 tasks
- **Lint Rules & Migration**: 7 tasks
- **Dark/Light Mode & Preview**: 9 tasks
- **Polish**: 12 tasks

**Grand Total**: 117 tasks

**Parallel Opportunities**:
- Setup phase: 2 tasks can run in parallel (T002, T003)
- Foundational phase: 7 tasks can run in parallel (T007-T013)
- After Foundational: User Stories can partially overlap (US1 starts first, US2/US3 follow after partial US1 completion)
- MCP phase: 6 tasks can run in parallel (T082-T087)
- Lint phase: 4 tasks can run in parallel (T093-T096 after T090-T092)
- Mode phase: 3 tasks can run in parallel (T097, T098, T103)
- Polish phase: 12 tasks can run in parallel (T106-T117)

**MVP Scope**: Phases 1-3 (Setup + Foundational + User Story 1) = **30 tasks**

**Independent Test Criteria**:
- User Story 1: Update primary.500 token → verify web/mobile buttons reflect change after build
- User Story 2: Implement Card variant="glass" → verify Liquidglass rendering or fallback on both platforms
- User Story 3: Submit accent.600 override in staging → verify only accent components change, logs show merged set
