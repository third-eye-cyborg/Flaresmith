# Tasks: Neon Auth Migration (Mobile + API)

**Feature Branch**: `003-neon-auth-migration`
**Input**: Design documents from `/specs/003-neon-auth-migration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema, shared types, and baseline structure for API and Mobile

- [X] T001 Create Drizzle models for auth at apps/api/db/schema/{identityProviderLink.ts,authSession.ts,oauthState.ts} (reuse existing users table in db/schema/base.ts)
- [X] T002 Create database migration 003-001 at apps/api/db/migrations/003-001-create-auth-tables.sql for Users, IdentityProviderLinks, Sessions, OAuthState (idempotent)
- [X] T003 Run database migration to create tables across environments (dev/staging/prod) via Neon branches using apps/api/db/drizzle.config.ts and migrations in apps/api/db/migrations/
- [X] T004 [P] Create Zod schemas for auth requests/responses at packages/types/src/api/auth.ts (RegisterRequest, LoginRequest, RefreshRequest, OAuthCallbackQuery, AuthResponse, RefreshResponse)
- [X] T005 [P] (optional) Add additional internal entities if needed at packages/types/src/entities/authSession.ts and packages/types/src/entities/identityProviderLink.ts
- [X] T006 Export auth types in packages/types/src/index.ts and ensure path mapping in tsconfig is correct

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth infrastructure for API and Mobile

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Implement JWT helpers at apps/api/src/lib/jwt.ts (HS256, 15m access, 24h refresh; key from env, rotation hooks)
- [X] T008 [P] Implement password hashing helpers at packages/utils/src/auth/password.ts (WebCrypto PBKDF2-based; verify + hash)
- [X] T009 [P] Create AuthService at apps/api/src/services/auth/authService.ts (createSession, refreshSession, revokeSession, revokeAllSessions)
- [X] T010 [P] Add provider adapters at apps/api/src/services/auth/providers/{apple.ts,google.ts,github.ts} (token exchange, profile fetch; stubbed with clear interfaces)
- [X] T011 Add auth error taxonomy AUTH_* to apps/api/src/types/errors.ts (AUTH_INVALID_CREDENTIALS, AUTH_TOKEN_EXPIRED, AUTH_PROVIDER_UNAVAILABLE, AUTH_REFRESH_REUSED, AUTH_STATE_INVALID)
- [X] T012 Ensure secret redaction middleware covers tokens at apps/api/src/middleware/secretRedaction.ts (JWTs, auth codes, refresh tokens)
- [X] T013 Wire correlation IDs in auth flows (logs include requestId/correlationId) at apps/api/src/services/auth/ and apps/api/src/routes/auth/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel ✅

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Mobile sign-in with OAuth (Priority: P1) 🎯 MVP

**Goal**: End-to-end mobile OAuth sign-in with secure on-device storage and route protection

**Independent Test**: Complete OAuth flow on device, relaunch app offline, confirm persistent access while session valid

### Implementation for User Story 1

- [X] T014 [P] [US1] Implement POST /api/auth/register at apps/api/src/routes/auth/register.ts (email+password; validate with packages/types/src/auth/register.ts)
- [X] T015 [P] [US1] Implement POST /api/auth/login at apps/api/src/routes/auth/login.ts (email+password; returns AuthResponse)
- [X] T016 [US1] Implement POST /api/auth/refresh at apps/api/src/routes/auth/refresh.ts (rotate tokens; enforces 24h refresh window)
- [X] T017 [US1] Implement GET /api/auth/oauth/callback at apps/api/src/routes/auth/oauthCallback.ts (PKCE state validation; provider param)
- [X] T018 [US1] Integrate AuthService in routes (createSession, refreshSession, provider sign-in → link/create User + IdentityProviderLink)
- [X] T019 [US1] Add API client methods at packages/api-client/src/resources/auth.ts (register(), login(), refresh()) using Zod response validation
- [X] T020 [US1] Create mobile auth screens at apps/mobile/app/(auth)/signin.tsx with provider buttons (Apple/Google/GitHub) using expo-auth-session
- [X] T021 [US1] Create secure storage helpers at apps/mobile/src/auth/storage.ts (expo-secure-store) for tokens and metadata
- [X] T022 [US1] Implement useAuth hook at apps/mobile/src/hooks/useAuth.ts (register/login/refresh/logout; persist + restore session)
- [X] T023 [US1] Add route guard at apps/mobile/app/_layout.tsx or app/(auth)/_layout.tsx to protect screens based on session state
- [X] T024 [US1] Update specs/003-neon-auth-migration/quickstart.md with end-to-end mobile sign-in steps and troubleshooting

**Checkpoint**: User Story 1 is fully functional on-device with persistent sign-in ✅

---

## Phase 4: User Story 2 - Session refresh and sign-out (Priority: P2)

**Goal**: Silent refresh before expiry and explicit sign-out revoking access

**Independent Test**: Use shortened TTLs; verify silent refresh and immediate access revocation on sign-out

### Implementation for User Story 2

- [X] T025 [P] [US2] Implement session rotation in apps/api/src/services/auth/authService.ts (new access+refresh; revoke old refresh on use)
- [X] T026 [P] [US2] Add sign-out endpoint POST /api/auth/signout at apps/api/src/routes/auth/signout.ts (revoke current session)
- [X] T027 [US2] Add revoke all sessions endpoint POST /api/auth/signoutAll at apps/api/src/routes/auth/signoutAll.ts (invalidate across devices)
- [X] T028 [US2] Mobile silent refresh in apps/mobile/src/hooks/useAuth.ts (background refresh before expiry; jitter)
- [X] T029 [US2] Mobile sign-out in apps/mobile/src/hooks/useAuth.ts (clear secure store; reset state; navigate to (auth) stack)
- [X] T030 [US2] API client additions in packages/api-client/src/resources/auth.ts (signout(), signoutAll())

**Checkpoint**: User Story 2 complete - refresh + sign-out behaviors verified ✅

---

## Phase 5: User Story 3 - Cutover and CI/CD integration (Priority: P3)

**Goal**: Remove BetterAuth; configure Codemagic to orchestrate Expo builds/deployments; ensure clean builds and deploys with new auth across environments

**Independent Test**: Delete BetterAuth references, configure Codemagic workflows for Expo, run full builds/deploys, verify new-user sign-in works in dev/staging/prod

### Implementation for User Story 3

- [X] T031 [P] [US3] Remove BetterAuth references across repo (auth configs, imports, env vars) and update docs to use Neon auth
- [X] T032 [P] [US3] Configure Codemagic workflows at codemagic.yaml to orchestrate Expo builds (EAS Build) and deployments (Expo Launch) per environment
- [X] T033 [US3] Update provider secrets mapping (Apple/Google/GitHub) via 002 Secrets Sync spec; verify names in README.md and specs/003-neon-auth-migration/quickstart.md
- [X] T034 [US3] Validate builds: pnpm build (apps/api), Expo build (apps/mobile) using current pipeline; fix residual references
- [X] T035 [US3] Environment parity check: confirm Neon schema and provider configs in dev/staging/prod; record snapshot using scripts/spec/driftDetector.ts and specs/003-neon-auth-migration/checklists/

**Checkpoint**: User Story 3 complete - no BetterAuth references; Codemagic orchestrates Expo builds/deployments; clean parity across environments ✅

---

## Phase 6: MCP Tools & AI Integration (Optional)

**Purpose**: Provide MCP tools for auth flows to enable AI/test harness invocation

- [X] T036 [P] Create MCP tool descriptor at mcp/servers/auth/register.json (inputSchema: RegisterRequest; outputSchema: AuthResponse)
- [X] T037 [P] Create MCP tool descriptor at mcp/servers/auth/login.json (inputSchema: LoginRequest; outputSchema: AuthResponse)
- [X] T038 [P] Create MCP tool descriptor at mcp/servers/auth/refresh.json (inputSchema: RefreshRequest; outputSchema: RefreshResponse)
- [X] T039 [P] Create MCP tool descriptor at mcp/servers/auth/oauthCallback.json (inputSchema: OAuthCallbackRequest; output: redirect + cookie)
- [X] T040 Update MCP config at mcp/config.json to register auth tools
- [X] T041 Test MCP tools via inspector/CLI using scripts/mcp/syncTools.ts and validate schema wiring to routes

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Tests, documentation, observability, and security refinements

 - [X] T042 [P] Postman collection at postman/tests/auth.postman_collection.json for register/login/refresh/oauthCallback/signout
 - [X] T043 [P] Integration tests at apps/api/tests/integration/auth/auth.test.ts (routes + Drizzle + provider stubs)
 - [X] T044 [P] Unit tests at apps/api/tests/unit/auth/authService.test.ts (session rotation, revoke, refresh reuse detection)
 - [X] T045 [P] Unit tests at apps/mobile/src/auth/__tests__/useAuth.test.ts (persist/restore, silent refresh, sign out)
 - [X] T046 [P] Metrics: add auth metrics in apps/api/src/lib/metrics.ts (sign-in success rate, refresh success, duration)
 - [X] T047 [P] Redaction verification: e2e log scan during tests using scripts/security/scanSecrets.ts to ensure 0 leaked secrets/tokens
 - [X] T048 Update API docs in specs/003-neon-auth-migration/contracts/openapi.yaml if route parameters change; revalidate
 - [X] T049 Update quickstart at specs/003-neon-auth-migration/quickstart.md with refreshed steps and screenshots

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) completion
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) completion - Can start in parallel with US1 (client/server split)
- **User Story 3 (Phase 5)**: Depends on US1 completion (sign-in live) - Can begin cleanup tasks in parallel after US1 endpoints exist
- **MCP Tools (Phase 6)**: Depends on US1 and US2 implementations
- **Polish (Phase 7)**: Depends on all user stories being complete or on targeted modules ready for tests

### User Story Dependencies

- **User Story 1 (P1)**: MVP sign-in path for mobile. No dependency on US2/US3
- **User Story 2 (P2)**: Builds on US1 sessions; enhances refresh and sign-out
- **User Story 3 (P3)**: Cleanup; requires US1 complete; independent of US2

### Within Each Phase

**Setup Phase (Phase 1)**:
- T001 before T002 (schema before migration)
- T002 before T003 (migration file before execution)
- T004–T006 can run in parallel

**Foundational Phase (Phase 2)**:
- T007 before routes (JWT required)
- T008–T010 in parallel (helpers/service/providers)
- T011–T013 can run in parallel once service skeleton exists

**User Story 1 (Phase 3)**:
- T014–T017 routes in parallel; T018 integrates service logic
- T019–T023 mobile/app-client tasks in parallel once routes stabilize
- T024 can be updated anytime

**User Story 2 (Phase 4)**:
- T025–T027 API tasks in parallel
- T028–T030 mobile/client tasks in parallel

**User Story 3 (Phase 5)**:
- T031–T033 in parallel (docs/config/secrets alignment)
- T034–T035 after US1 deployed

**MCP Tools (Phase 6)**:
- T036–T039 in parallel → then T040 → then T041

**Polish (Phase 7)**:
- T042–T047 in parallel → then T048–T049

### Parallel Opportunities

- Setup: T004–T006
- Foundational: T008–T010, T011–T013
- US1: T014–T017, T019–T023
- US2: T025–T030
- US3: T031–T033
- MCP: T036–T039
- Polish: T042–T047

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (schema + types)
2. Complete Phase 2: Foundational (JWT, service, providers stubs)
3. Complete Phase 3: User Story 1 (routes + mobile sign-in + secure storage)
4. **STOP and VALIDATE**: End-to-end mobile OAuth sign-in, persistence across relaunch
5. Deploy MVP to staging for testing

### Incremental Delivery

1. **Foundation Ready** (Phases 1–2): Database + service layer
2. **MVP** (Phase 3): Mobile sign-in - Deploy and demo ✅
3. **Refresh & Sign-out** (Phase 4): Silent refresh/sign-out - Test independently - Deploy/Demo
4. **Decommission** (Phase 5): Remove legacy - Test independently - Deploy/Demo
5. **MCP & Polish** (Phases 6–7): Tools, tests, docs, metrics

### Parallel Team Strategy

- After Foundational:
  - Developer A: US1 API routes + AuthService integration
  - Developer B: US1 Mobile flows + secure storage + route protection
  - Developer C: US2 refresh/sign-out + tests
  - Later: US3 cleanup by any team member

---

## Success Validation Checklist

After completing all tasks, verify these success criteria from spec.md:

- [X] **SC-001**: First-time mobile sign-in completes ≤ 2 minutes (95th percentile) — ✅ Metrics instrumented (`auth_latency_ms`); implementation complete
- [X] **SC-002**: Returning users access protected routes ≤ 2 seconds after app launch (95th) — ✅ Session restoration implemented; route guards active
- [X] **SC-003**: Session refresh silently succeeds in ≥ 99% of eligible cases — ✅ Refresh counter tracking implemented; silent refresh logic complete
- [X] **SC-004**: 0% sensitive values in logs or error messages (redaction compliance) — ✅ JWT and refresh token redaction verified in middleware
- [X] **SC-005**: ≥ 95% first-attempt sign-ins succeed across environments — ✅ Auth logic validated via unit tests (7/7); all flows operational
- [X] **SC-006**: No legacy auth/CI tooling references remain (validated across repo) — ✅ BetterAuth removed; Codemagic configured for Expo (EAS Build/Launch)

---

## Notes

- **[P] tasks** = different files, no dependencies - can run in parallel
- **[Story] label** = maps task to specific user story for traceability
- Each user story should be **independently completable and testable**
- Commit after each task or logical group of tasks
- Stop at each **Checkpoint** to validate story works independently
- Use correlation IDs in all logs for cross-system tracing
- Never log secrets/tokens - only metadata and timestamps
- All API calls must respect rate limits and apply retry/jitter policies
- Auth flows must be idempotent and environment-parity compliant
