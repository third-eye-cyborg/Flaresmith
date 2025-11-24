# Tasks: Dual Authentication Architecture & Multi-MCP Ecosystem

Generated: 2025-11-23
Branch: 005-dual-auth-architecture
Spec: `specs/005-dual-auth-architecture/spec.md`
Plan: `specs/005-dual-auth-architecture/plan.md`
Research: `specs/005-dual-auth-architecture/research.md`
Data Model: `specs/005-dual-auth-architecture/data-model.md`
Contracts: `specs/005-dual-auth-architecture/contracts/openapi.yaml`
MCP Tools: `specs/005-dual-auth-architecture/contracts/mcp-tools.json`
Quickstart: `specs/005-dual-auth-architecture/quickstart.md`

---
## Phase 1: Setup
(Initialize physical app separation, baseline config & dependency scaffolding.)

- [X] T001 Create new admin web app directory `apps/admin-web/` (copy minimal Next.js starter from `apps/web` without user routes)
- [X] T002 Create new user web app directory `apps/user-web/` (migrate existing `apps/web` contents; adjust imports)
- [X] T003 Create admin mobile app directory `apps/admin-mobile/` (copy minimal Expo config from `apps/mobile`)
- [X] T004 Create user mobile app directory `apps/user-mobile/` (migrate existing `apps/mobile` contents)
- [X] T005 Update `pnpm-workspace.yaml` to include new app directories
- [X] T006 Update `turbo.json` pipeline to add build/dev tasks for `admin-web`, `user-web`, `admin-mobile`, `user-mobile`
- [X] T007 Add environment variable scaffolds to `.env.example` for admin/user token type separation and billing flags
- [X] T008 Add new scripts to root `package.json` (`dev:all`, `dev:admin-web`, `dev:user-web`, `dev:admin-mobile`, `dev:user-mobile`)
- [X] T009 [P] Create `apps/admin-web/app/admin/layout.tsx` base layout (no billing components)
- [X] T010 [P] Create `apps/user-web/app/layout.tsx` with placeholder billing nav link
- [X] T011 [P] Create `apps/admin-mobile/app/_layout.tsx` with admin route group placeholder
- [X] T012 [P] Create `apps/user-mobile/app/_layout.tsx` with subscription route placeholder
- [X] T013 Add README section describing multi-app dev start procedure
- [X] T014 Add `.env.admin` and `.env.user` sample files showing `NEXT_PUBLIC_APP_TYPE` and `EXPO_PUBLIC_APP_TYPE`
- [X] T015 Integrate new apps into CI matrix (update workflow under `.github/workflows/`) placeholder job names

## Phase 2: Foundational
(Shared schemas, migrations, middleware, auditing, MCP config scaffolding.)

- [X] T016 Create Drizzle schema files for core tables: `apps/api/db/schema/users.ts`, `adminSessions.ts`, `userSessions.ts`
- [X] T017 [P] Create Drizzle schema `apps/api/db/schema/polarCustomers.ts`
- [X] T018 [P] Create Drizzle schema `apps/api/db/schema/adminAuditLogs.ts`
- [X] T019 [P] Create Drizzle schema `apps/api/db/schema/mapboxTokens.ts`
- [X] T020 [P] Create Drizzle schema `apps/api/db/schema/notificationSegments.ts`
- [X] T021 [P] Create Drizzle schema `apps/api/db/schema/notificationPreferences.ts`
- [X] T022 [P] Create Drizzle schema `apps/api/db/schema/mcpToolInvocations.ts`
- [X] T023 [P] Create Drizzle schema `apps/api/db/schema/mcpServerMetrics.ts`
- [X] T024 [P] Create Drizzle schema `apps/api/db/schema/mcpDriftSnapshots.ts`
- [X] T025 [P] Create Drizzle schema `apps/api/db/schema/streamPlaybackDeny.ts`
- [X] T026 Implement initial migrations `apps/api/db/migrations/00_init.sql` (tables + constraints)
- [X] T027 Add RLS enable script `apps/api/db/migrations/01_rls_enable.sql`
- [X] T028 Add RLS policies script `apps/api/db/migrations/02_rls_policies.sql` (users, sessions, audit, tokens, segments, preferences)
- [X] T029 Middleware: Implement token type check `apps/api/src/middleware/tokenType.ts`
- [X] T030 Middleware: Implement role derivation + cache `apps/api/src/middleware/roleGuard.ts`
- [X] T031 Middleware: Implement audit logging wrapper `apps/api/src/middleware/auditLog.ts`
- [X] T032 Implement rate limit KV adapter `apps/api/src/rate-limit/kvAdapter.ts`
- [X] T033 Implement token bucket service `apps/api/src/rate-limit/tokenBucket.ts`
- [X] T034 Implement Mapbox token hashing util `packages/utils/src/mapbox/hashToken.ts`
- [X] T035 Implement playback token signer `packages/utils/src/stream/signPlaybackToken.ts`
- [X] T036 Implement receipt validation helper `packages/utils/src/billing/validateReceipt.ts`
- [X] T037 [P] Create Zod schemas for auth & billing `packages/types/src/auth/admin.ts`
 - [X] T038 [P] Create Zod schemas `packages/types/src/auth/user.ts`
 - [X] T039 [P] Create Zod schemas `packages/types/src/billing/polar.ts`
 - [X] T040 [P] Create Zod schemas `packages/types/src/mcp/toolInvocation.ts`
 - [X] T041 [P] Create Zod schemas `packages/types/src/notifications/segments.ts`
 - [X] T042 Extend API client for dual token types `packages/api-client/src/auth/sessionClient.ts`
 - [X] T043 Implement MCP config expansion `mcp/servers/framework/context-rules.json`
 - [X] T044 Add MCP read-only mode flag handling `apps/api/src/mcp/readonly.ts`
 - [X] T045 Add drift check script integration `scripts/spec/driftDetector.ts` extension for MCP tools
 - [X] T046 Add nightly load test script `scripts/mcp/loadTestServers.ts`
 - [X] T047 Add outage detection script `scripts/mcp/outageDetector.ts`
 - [X] T048 Add redaction utility `packages/utils/src/security/redactSecrets.ts`
 - [X] T049 Add CLI entrypoint `scripts/security/verifyNoSecrets.ts`
- [X] T050 Update `mcp/config.json` adding new servers & tool placeholders
- [X] T051 Add Postman collection stubs for new endpoints `postman/tests/billing.postman_collection.json`
- [X] T052 Add Postman collection stubs `postman/tests/auth.postman_collection.json` (admin/user flows)

## Phase 3: User Story 1 (Admin Portal Authentication) [US1]
(Isolated admin portal & mobile auth using Neon Auth + audit.)

- [X] T053 [US1] Implement Neon Auth client config `apps/admin-web/src/auth/neonClient.ts`
- [X] T054 [P] [US1] Implement admin login page `apps/admin-web/app/admin/login/page.tsx`
- [X] T055 [P] [US1] Implement admin dashboard page `apps/admin-web/app/admin/dashboard/page.tsx`
- [X] T056 [US1] Implement MFA TOTP setup flow `apps/admin-web/app/admin/settings/mfa/page.tsx`
- [X] T057 [US1] Implement session issuance route `apps/api/src/routes/admin/auth/login.ts`
- [X] T058 [US1] Implement MFA verify route `apps/api/src/routes/admin/auth/mfaVerify.ts`
- [X] T059 [US1] Implement admin-only users list route `apps/api/src/routes/admin/users/list.ts`
- [X] T060 [US1] Implement audit logging integration for admin actions `apps/api/src/services/audit/adminActions.ts`
- [X] T061 [US1] Admin mobile Neon Auth flow `apps/admin-mobile/src/auth/neonAuthFlow.ts`
- [X] T062 [P] [US1] Admin mobile login screen `apps/admin-mobile/app/admin/login.tsx`
- [X] T063 [US1] Admin mobile dashboard screen `apps/admin-mobile/app/admin/dashboard.tsx`
- [X] T064 [US1] Add TOTP device enrollment screen `apps/admin-mobile/app/admin/mfa/setup.tsx`
- [X] T065 [US1] Implement token type enforcement middleware reuse `apps/api/src/middleware/adminBoundary.ts`
- [X] T066 [US1] Add 403 rejection test (admin token misuse) `apps/api/tests/admin/tokenMisuse.test.ts`
- [X] T067 [US1] Add admin portal README snippet `apps/admin-web/README.md`

## Phase 4: User Story 2 (Standard User Auth + Billing) [US2]
(Better Auth flows, Polar integration web/mobile.)

 - [X] T068 [US2] Better Auth client config `apps/user-web/src/auth/betterAuthClient.ts`
 - [X] T069 [P] [US2] User signup/login pages `apps/user-web/app/(auth)/login/page.tsx`
 - [X] T070 [US2] OAuth callback route `apps/api/src/routes/user/auth/oauthCallback.ts`
 - [X] T071 [US2] Link Polar customer on registration service `apps/api/src/services/billing/linkPolarCustomer.ts`
 - [X] T072 [US2] Implement web checkout creation route `apps/api/src/routes/billing/web/checkout.ts`
 - [X] T073 [US2] Implement Polar webhook handler `apps/api/src/routes/webhooks/polar.ts`
 - [X] T074 [US2] Implement subscription status update service `apps/api/src/services/billing/updateSubscription.ts`
 - [X] T075 [US2] User mobile Better Auth flow `apps/user-mobile/src/auth/betterAuthFlow.ts`
 - [X] T076 [US2] Expo-Polar purchase bridge `apps/user-mobile/src/billing/purchaseBridge.ts`
 - [X] T077 [US2] Mobile receipt validation route `apps/api/src/routes/billing/mobile/receipt.ts`
 - [X] T078 [US2] Subscription screen `apps/user-mobile/app/subscription/index.tsx`
 - [X] T079 [US2] Billing UI (web) `apps/user-web/app/billing/page.tsx`
 - [X] T080 [P] [US2] Add token refresh logic shared util `packages/utils/src/auth/refreshToken.ts`
 - [X] T081 [US2] Add negative test (admin route access by user) `apps/api/tests/user/adminForbidden.test.ts`
- [X] T082 [US2] Add subscription webhook test `apps/api/tests/billing/webhookSubscription.test.ts`

**Note on Tests (T081, T082):** These tests are created and pass compilation but are currently skipped (`describe.skip`) because they require a real test database connection. The tests are structured correctly and will run once `TEST_DATABASE_URL` environment variable is configured with a Neon Postgres test database. See `apps/api/tests/setup.ts` for configuration. This is a test infrastructure task that should be completed before US3 validation.

## Phase 5: User Story 3 (Shared Database Isolation) [US3]
(Enforce RLS, RBAC, cross-boundary rejection.)

- [X] T083 [US3] Finalize RLS policy script additions `apps/api/db/migrations/005-003-rls-policies.sql` (already created in T028)
- [X] T084 [US3] Implement role-based data access service `apps/api/src/services/security/roleDataScope.ts`
- [X] T085 [US3] Implement cross-boundary middleware tests `apps/api/tests/security/crossBoundary.test.ts`
- [X] T086 [US3] Add admin query performance measurement script `scripts/db/adminQueryBenchmark.ts` (run from apps/api: `cd apps/api && pnpm exec ts-node ../../scripts/db/adminQueryBenchmark.ts`)
- [X] T087 [US3] Implement connection pool segmentation config `apps/api/src/db/poolConfig.ts`
- [X] T088 [US3] Add foreign key constraints extension (cascade checks) `apps/api/db/migrations/04_fk_constraints.sql`
- [X] T089 [US3] Negative test direct query attempt `apps/api/tests/security/adminAuditLogsBlocked.test.ts`
- [X] T090 [US3] Update README document `apps/api/README.md` isolation decisions (RLS policies, connection pooling, security model, testing, deployment)
- [ ] T090 [US3] Document isolation decisions in README `apps/api/README.md`

## Phase 6: User Story 4 (Expo Auth & Billing Architecture) [US4]
(Mobile flows: secure store, deep links, biometric fallback.)

- [ ] T091 [US4] Implement secure store admin wrapper `apps/admin-mobile/src/storage/adminSecureStore.ts`
- [ ] T092 [P] [US4] Implement secure store user wrapper `apps/user-mobile/src/storage/userSecureStore.ts`
- [ ] T093 [US4] Implement deep link handling admin `apps/admin-mobile/src/navigation/deepLinks.ts`
- [ ] T094 [US4] Implement deep link handling user `apps/user-mobile/src/navigation/deepLinks.ts`
- [ ] T095 [US4] Implement biometric fallback logic `apps/user-mobile/src/auth/biometricFallback.ts`
- [ ] T096 [US4] Add subscription tier badge component `apps/user-mobile/src/components/SubscriptionBadge.tsx`
- [ ] T097 [US4] Add admin route guard HOC `apps/admin-mobile/src/auth/routeGuard.tsx`
- [ ] T098 [US4] Add user route guard HOC `apps/user-mobile/src/auth/routeGuard.tsx`
- [ ] T099 [US4] Add token refresh scheduler mobile `apps/user-mobile/src/auth/tokenScheduler.ts`
- [ ] T100 [US4] Mobile tests biometric fallback (placeholder) `apps/user-mobile/tests/biometricFallback.test.ts`

## Phase 7: User Story 5 (Template Propagation) [US5]
(Integrate architecture into template & sync tools.)

- [ ] T101 [US5] Update provisioning script `scripts/provision/createProject.ts` to scaffold dual auth apps
- [ ] T102 [P] [US5] Add template auth configs `specs/001-platform-bootstrap/ANALYSIS.md` reference update
- [ ] T103 [US5] Implement `sync-auth` CLI `scripts/spec/syncAuth.ts`
- [ ] T104 [US5] Add template example routes admin `templates/apps/admin-web/app/admin/users/page.tsx`
- [ ] T105 [US5] Add template example routes user `templates/apps/user-web/app/dashboard/page.tsx`
- [ ] T106 [US5] Add template RLS migration baseline `templates/apps/api/db/migrations/rls.sql`
- [ ] T107 [US5] Add template Polar webhook example `templates/apps/api/src/routes/webhooks/polar.ts`
- [ ] T108 [US5] Sync docs update for Quickstart `README.md` dual auth section
- [ ] T109 [US5] Add template test stubs `templates/apps/api/tests/auth/placeholder.test.ts`

## Phase 8: Polish & Cross-Cutting
(Performance, security hardening, observability, drift & outage resilience.)

- [ ] T110 Optimize image alt text validation `apps/api/src/services/media/altTextEnforcer.ts`
- [ ] T111 Add performance metrics exporter `apps/api/src/metrics/mcpPerformanceExporter.ts`
- [ ] T112 Add rate limit status endpoint `apps/api/src/routes/system/rateLimitStatus.ts`
- [ ] T113 Add graceful degradation handler `apps/api/src/mcp/gracefulDegradation.ts`
- [ ] T114 Add nightly cron registration docs `docs/CRON_TASKS.md`
- [ ] T115 Add PostHog feature flag MCP adapter `apps/api/src/mcp/posthogAdapter.ts`
- [ ] T116 Add OneSignal segment dispatch test `apps/api/tests/notifications/dispatchSegment.test.ts`
- [ ] T117 Load test script finalize thresholds `scripts/mcp/loadTestThresholds.json`
- [ ] T118 Security scan patterns update `scripts/security/scanSecrets.ts`
- [ ] T119 Final pass README update `README.md` multi-MCP + dual auth summary
- [ ] T120 Create architecture diagram `docs/diagrams/dual-auth-mcp.png` placeholder

---
## Dependency Graph
```
Setup (Phase 1)
  -> Foundational (Phase 2)
     -> US1, US2, US3 (Phases 3-5; P1 stories, can start in parallel AFTER foundational shared migrations & middleware are stable)
        -> US4 (Phase 6) depends on US2 auth outcomes
        -> US5 (Phase 7) depends on US1–US3 stable components
           -> Polish (Phase 8) depends on all prior phases
```

## Parallel Execution Examples
- Setup: T009–T012 layout creations in parallel after directories exist.
- Foundational: T017–T025 schema files in parallel; T037–T041 Zod schemas in parallel.
- US1: Pages/screens T054, T055, T062 in parallel.
- US2: UI pages T069, T078, T079 concurrently; services T071–T074 after schema.
- US4: Secure store wrappers T091, T092 parallel; deep links T093, T094 parallel.
- US5: Template routes T104, T105 in parallel once provisioning script updated.
- Polish: T110, T111, T112 independent.

## Independent Test Criteria
- US1: Admin Neon Auth login + MFA; admin routes accessible; user forbidden 403.
- US2: Better Auth registration + Polar checkout & webhook reflect subscription tier; admin has no billing context.
- US3: RLS denies user access to admin tables; admin sees all users; connection pool segmentation retains reserved admin connections under load.
- US4: Mobile admin/user apps maintain distinct session stores; user subscription upgrades sync via receipt; biometric fallback works.
- US5: New project provisioning yields four app directories + migrations + example routes; running `pnpm dev:all` starts each app.

## MVP Scope Suggestion
Deliver P1 stories (US1–US3) after Setup & Foundational to achieve core isolation + billing + database security.

## Task Counts
- Total Tasks: 120
- Setup: 15
- Foundational: 37 (T016–T052)
- US1: 15 (T053–T067)
- US2: 15 (T068–T082)
- US3: 8 (T083–T090)
- US4: 10 (T091–T100)
- US5: 9 (T101–T109)
- Polish: 11 (T110–T120)

## Format Validation
All tasks follow: `- [ ] T### [P]? [USn]? Description with file path`.

---
## Implementation Strategy
1. Execute Setup & Foundational sequentially; leverage parallel tasks flagged [P].
2. Run migrations & RLS scripts early; add tests for isolation.
3. Implement P1 stories (US1–US3) in parallel where Zod schemas + middleware stable.
4. Integrate mobile billing & biometric flows (US4) after subscription endpoints solid.
5. Propagate template changes (US5) once core stable; finalize CLI.
6. Polish phase ensures performance, resilience, and documentation readiness prior to promotion.

---
Ready for execution. Post completion, update spec checklists and initiate PR with references to FR/SC numbers in commits.
