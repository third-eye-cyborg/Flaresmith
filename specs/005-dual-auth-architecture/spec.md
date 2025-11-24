# Feature Specification: Dual Authentication Architecture

**Feature Branch**: `005-dual-auth-architecture`  
**Created**: 2025-11-23  
**Status**: Draft  
**Input**: User description: "Dual authentication architecture with Neon Auth for admin portal (web/mobile) and Better Auth for standard users (web/mobile), isolated flows on shared database with subdomain separation"

## User Scenarios & Testing

### User Story 1 - Admin Portal Authentication (Priority: P1)

Admin users access a completely isolated admin portal on `admin.cloudmake.dev` subdomain with dedicated Neon Auth flows for both web and mobile (Expo) applications. Admin authentication, routes, UI components, and bundle configurations are entirely separate from standard user systems.

**Why this priority**: Admin access is foundational for platform management and must be completely isolated from standard users to prevent accidental privilege escalation or access to admin-only operations.

**Independent Test**: Admin can authenticate via Neon Auth on `admin.cloudmake.dev` web app and admin mobile app, access admin-only routes (e.g., `/admin/users`, `/admin/projects`), while standard users attempting to access these routes are rejected with 403 Forbidden. Admin session tokens are distinct from standard user tokens.

**Acceptance Scenarios**:

1. **Given** admin user exists in database with `role=admin`, **When** admin navigates to `admin.cloudmake.dev` and authenticates via Neon Auth, **Then** admin receives admin-scoped session token and can access admin dashboard
2. **Given** standard user attempts to access `admin.cloudmake.dev/admin/users`, **When** request is made, **Then** system returns 403 Forbidden and redirects to standard user login
3. **Given** admin user is authenticated on admin mobile app, **When** admin performs admin-only action (e.g., suspend user account), **Then** action succeeds and audit log records admin user ID and action
4. **Given** admin session token is presented to standard user API endpoint, **When** token validation occurs, **Then** request is rejected as invalid token type
5. **Given** admin user navigates to standard user domain (e.g., `app.cloudmake.dev`), **When** admin session token is presented, **Then** system treats admin as unauthenticated and requires separate standard user login

---

### User Story 2 - Standard User Authentication with Billing (Priority: P1)

Standard users authenticate via Better Auth on the main application domain (`app.cloudmake.dev`) for both web and mobile (Expo) applications, with tight integration to Polar for billing/subscriptions and payments. Polar integration is **exclusive to standard user apps** (admin apps have no payment/billing functionality). The web app uses Polar Hono library for server-side billing operations, while the mobile app uses Expo-to-Polar connection for native payment flows. Standard user auth flows are completely isolated from admin systems.

**Why this priority**: Standard user authentication is the primary user-facing authentication system and must integrate seamlessly with billing (Polar) to enable subscription management, payment processing, and usage-based pricing. Admin apps focus on platform management and do not require payment functionality.

**Independent Test**: Standard user can register via Better Auth on `app.cloudmake.dev`, authenticate using email/password or OAuth providers (Google, GitHub), link Polar customer record, view subscription status, process payments (web: Polar Hono endpoints, mobile: Expo-Polar native checkout), and access standard user routes. Standard user cannot access any admin routes or functionality. Admin apps have no Polar integration.

**Acceptance Scenarios**:

1. **Given** new user visits `app.cloudmake.dev/signup`, **When** user completes Better Auth registration with email/password, **Then** user account is created with `role=user`, receives standard user session token, and Polar customer record is created automatically
2. **Given** authenticated standard user, **When** user attempts to access `admin.cloudmake.dev` or admin API routes, **Then** system returns 403 Forbidden
3. **Given** standard user authenticates via Google OAuth, **When** Better Auth processes OAuth callback, **Then** user is linked to Polar customer record and session includes `polar_customer_id` and subscription tier
4. **Given** standard user on web app, **When** user initiates subscription upgrade, **Then** Polar Hono library processes checkout session and webhook updates user subscription tier in database
5. **Given** standard user on mobile app, **When** user initiates in-app purchase, **Then** Expo-Polar connection processes native payment and syncs subscription status with backend
6. **Given** standard user session token, **When** token is presented to standard user API endpoints, **Then** requests succeed with user-scoped permissions and subscription-based feature flags
7. **Given** standard user attempts to access admin-only database tables (via compromised query), **When** query is executed, **Then** database row-level security policies block access

---

### User Story 3 - Shared Database Isolation (Priority: P1)

Both admin and standard user authentication systems operate on the same Neon Postgres database with strict isolation enforced via role-based access control (RBAC), row-level security (RLS), and application-level authorization middleware. Admins can query user data for support/management, but standard users cannot access admin data or operations.

**Why this priority**: Data isolation is critical for security and regulatory compliance. Shared database enables unified reporting and admin management while preventing privilege escalation.

**Independent Test**: Database RLS policies prevent standard users from querying admin-only tables (`admin_audit_logs`, `admin_sessions`), admin users can query `users` table but standard users see only their own records, and application middleware rejects cross-boundary requests (e.g., standard user token to admin API).

**Acceptance Scenarios**:

1. **Given** standard user authenticated with `user_id=123`, **When** user queries `users` table, **Then** RLS policy returns only records where `user_id=123`
2. **Given** admin user authenticated with `role=admin`, **When** admin queries `users` table, **Then** all user records are returned
3. **Given** standard user attempts direct SQL query to `admin_audit_logs`, **When** query is executed, **Then** RLS policy returns zero rows regardless of query parameters
4. **Given** admin user performs sensitive action (e.g., delete user), **When** action completes, **Then** event is logged to `admin_audit_logs` with admin ID, timestamp, action type, and affected entities
5. **Given** mixed workload (admin and standard user requests), **When** database connection pool is under load, **Then** admin queries are prioritized via connection pool segmentation

---

### User Story 4 - Expo Authentication & Billing Architecture (Priority: P2)

Both admin mobile app and standard user mobile app use Expo's authentication architecture with provider-specific flows: admin app uses Expo + Neon Auth integration (no billing), standard user app uses Expo + Better Auth + Polar integration for payments. Standard user mobile app includes Expo-to-Polar connection for native in-app purchases and subscription management. Both apps share underlying Expo Router navigation but with distinct route guards, session management, and billing capabilities.

**Why this priority**: Mobile authentication must align with Expo best practices (secure token storage, deep linking, biometric auth) while maintaining strict separation between admin and user contexts. Standard user mobile app requires native payment flows via Expo-Polar integration for seamless subscription management.

**Independent Test**: Admin mobile app authenticates via Neon Auth with Expo Secure Store for token persistence (no billing functionality), standard user mobile app authenticates via Better Auth with identical secure storage patterns plus Expo-Polar connection for processing in-app purchases. Both apps handle deep links to respective domains without cross-contamination.

**Acceptance Scenarios**:

1. **Given** admin installs admin mobile app, **When** admin completes Neon Auth flow, **Then** admin session token is stored in Expo Secure Store with key prefix `admin_` and no billing UI is present
2. **Given** standard user installs user mobile app, **When** user completes Better Auth flow, **Then** user session token is stored in Expo Secure Store with key prefix `user_` and Polar customer ID is cached for billing operations
3. **Given** standard user on mobile app, **When** user navigates to subscription screen, **Then** Expo-Polar connection fetches available plans from Polar and displays native payment sheet
4. **Given** standard user completes in-app purchase, **When** Expo-Polar processes payment, **Then** subscription status syncs with backend via Polar webhook and user session updates subscription tier
5. **Given** admin mobile app receives deep link to `admin.cloudmake.dev/admin/projects/123`, **When** app processes link, **Then** admin is navigated to project detail screen (if authenticated) or admin login screen (if unauthenticated)
6. **Given** standard user mobile app receives deep link to `app.cloudmake.dev/dashboard`, **When** app processes link, **Then** user is navigated to dashboard (if authenticated) or user login screen (if unauthenticated)
7. **Given** admin mobile app and user mobile app installed on same device, **When** user switches between apps, **Then** each app maintains independent authentication state and billing context without interference

---

### User Story 5 - Monorepo Template Propagation (Priority: P2)

The dual authentication architecture is baked into the CloudMake platform's monorepo template, so every project created by CloudMake includes both admin and standard user auth systems with proper isolation. Template propagation ensures consistency across all generated projects.

**Why this priority**: CloudMake's value proposition is rapid, spec-driven project provisioning. The dual auth architecture must be a first-class template feature that users receive automatically.

**Independent Test**: When user creates new project via CloudMake, generated monorepo includes `apps/admin-web`, `apps/admin-mobile`, `apps/user-web`, `apps/user-mobile` with respective authentication configurations pre-wired. Running `pnpm dev` starts all four apps with distinct auth flows.

**Acceptance Scenarios**:

1. **Given** CloudMake user creates new project "Acme SaaS", **When** provisioning completes, **Then** generated repo includes admin and user app directories with Neon Auth and Better Auth configs respectively
2. **Given** generated project structure, **When** developer runs `pnpm dev`, **Then** admin web app starts on `localhost:3001`, user web app on `localhost:3000`, admin mobile on Expo (admin bundle), user mobile on Expo (user bundle)
3. **Given** generated project database schema, **When** initial migration runs, **Then** RLS policies for `users`, `admin_sessions`, `user_sessions` are created automatically
4. **Given** generated project has outdated auth patterns, **When** CloudMake template is updated, **Then** project can run `pnpm exec cloudmake sync-auth` to pull latest auth architecture changes
5. **Given** CloudMake platform dogfoods itself, **When** platform updates its own auth system, **Then** changes propagate to template and all future generated projects

---

### Edge Cases

- **Cross-domain session sharing**: What happens when admin user navigates from `admin.cloudmake.dev` to `app.cloudmake.dev` in same browser? System must not share sessions; admin must authenticate separately as standard user.
- **Database migration conflicts**: How does system handle migration when adding new admin-only table while standard users are actively querying database? Use zero-downtime migration patterns with RLS policies applied atomically.
- **Token expiration misalignment**: What happens when admin session expires mid-operation while viewing user data? System must gracefully re-authenticate admin without losing context (e.g., redirect to admin login with return URL).
- **Expo app bundle confusion**: What happens if user accidentally installs admin mobile app instead of user mobile app? App should detect user role mismatch during auth and display clear error ("This app is for administrators only. Please download the CloudMake app for standard users.").
- **Subdomain DNS propagation**: What happens when `admin.` subdomain is not yet propagated but admin attempts to access admin portal? Provide fallback admin route on main domain (e.g., `app.cloudmake.dev/__admin`) with prominent "Use admin.cloudmake.dev" banner.
- **Database connection pool exhaustion**: What happens when standard user traffic spikes and consumes all database connections, blocking admin access? Implement connection pool segmentation: 80% standard users, 20% admin (minimum 5 connections reserved for admin).
- **Role escalation via API**: What happens when attacker intercepts standard user token and manually adds `role=admin` claim before re-signing? Token signature validation must fail; role claim is server-authoritative (derived from database, not token payload).
- **Biometric auth failure on mobile**: What happens when Expo biometric auth fails (device unsupported, biometric not enrolled)? Gracefully fall back to password-based auth with clear user messaging.

## Requirements

### Functional Requirements

#### Authentication Systems

- **FR-001**: System MUST implement Neon Auth for admin portal web app (`apps/admin-web`) with email/password and MFA (TOTP) support
- **FR-002**: System MUST implement Neon Auth for admin portal mobile app (`apps/admin-mobile`) using Expo's authentication architecture with secure token storage
- **FR-003**: System MUST implement Better Auth for standard user web app (`apps/user-web`) with email/password, magic link, and OAuth providers (Google, GitHub, Microsoft)
- **FR-004**: System MUST implement Better Auth for standard user mobile app (`apps/user-mobile`) using Expo's authentication architecture with biometric authentication support (Face ID, Touch ID, fingerprint)
- **FR-005**: System MUST integrate Better Auth with Polar for billing/subscription context in standard user sessions (web and mobile); admin sessions MUST NOT include billing context
- **FR-005a**: System MUST use Polar Hono library for server-side billing operations in standard user web app API routes (checkout session creation, webhook handling, subscription queries)
- **FR-005b**: System MUST use Expo-to-Polar connection for native in-app purchase flows in standard user mobile app (payment sheet presentation, purchase completion, receipt validation)
- **FR-006**: System MUST enforce distinct session token formats: admin tokens include `type:admin` claim, user tokens include `type:user` claim
- **FR-007**: System MUST validate token type at application middleware layer and reject cross-boundary requests (admin token to user API or vice versa)

#### Domain & Subdomain Isolation

- **FR-008**: Admin portal web app MUST be accessible exclusively on `admin.cloudmake.dev` subdomain (or `admin.<project-domain>` for generated projects)
- **FR-009**: Standard user web app MUST be accessible on primary domain `app.cloudmake.dev` (or `app.<project-domain>` for generated projects)
- **FR-010**: System MUST configure CORS policies to prevent cross-origin requests between admin and user domains
- **FR-011**: System MUST set cookie `SameSite=Strict` and `Domain` attributes to prevent session leakage between admin and user subdomains
- **FR-012**: System MUST include CSP headers to restrict admin portal to `admin.` subdomain origins only

#### Database Isolation & Security

- **FR-013**: System MUST implement row-level security (RLS) policies on all user-accessible tables to enforce user-scoped data access
- **FR-014**: System MUST create admin-only tables (`admin_audit_logs`, `admin_sessions`, `admin_config`) with RLS policies blocking standard user access
- **FR-015**: System MUST derive user role from `users.role` column in database; role MUST NOT be solely trust from token claims
- **FR-016**: System MUST log all admin actions (CRUD on users, config changes, role modifications) to `admin_audit_logs` with admin user ID, timestamp, action type, affected entities, and IP address
- **FR-017**: System MUST segment database connection pool: 20% reserved for admin queries (minimum 5 connections), 80% for standard user queries
- **FR-018**: System MUST enforce foreign key constraints to prevent orphaned records when admin deletes user accounts

#### Routing & Authorization

- **FR-019**: Admin web app MUST define routes under `/admin/*` namespace (e.g., `/admin/dashboard`, `/admin/users`, `/admin/projects`)
- **FR-020**: Standard user web app MUST define routes under `/*` namespace (e.g., `/dashboard`, `/settings`, `/projects`)
- **FR-021**: System MUST implement authorization middleware that checks both token type (`admin` vs `user`) AND user role from database before granting route access
- **FR-022**: System MUST return HTTP 403 Forbidden when user with `type:user` token attempts to access `/admin/*` routes
- **FR-023**: Admin mobile app MUST use Expo Router with admin-specific route guards checking `type:admin` token
- **FR-024**: Standard user mobile app MUST use Expo Router with user-specific route guards checking `type:user` token

#### Bundle & Build Separation

- **FR-025**: Admin web app MUST be built as separate Next.js application in `apps/admin-web` with distinct `package.json` and build output
- **FR-026**: Standard user web app MUST be built as separate Next.js application in `apps/user-web` with distinct `package.json` and build output
- **FR-027**: Admin mobile app MUST be built as separate Expo application in `apps/admin-mobile` with distinct `app.json` (`bundleIdentifier: "com.cloudmake.admin"`) and bundle output
- **FR-028**: Standard user mobile app MUST be built as separate Expo application in `apps/user-mobile` with distinct `app.json` (`bundleIdentifier: "com.cloudmake.app"`) and bundle output
- **FR-029**: System MUST include `NEXT_PUBLIC_APP_TYPE=admin` environment variable for admin web app and `NEXT_PUBLIC_APP_TYPE=user` for user web app
- **FR-030**: System MUST include `EXPO_PUBLIC_APP_TYPE=admin` environment variable for admin mobile app and `EXPO_PUBLIC_APP_TYPE=user` for user mobile app

#### Shared Infrastructure & Packages

- **FR-031**: System MUST use shared Neon Postgres database for both admin and standard user data with connection string accessible to both web and mobile apps
- **FR-032**: System MUST create shared packages for common utilities (`packages/utils`), UI components (`packages/ui`), and types (`packages/types`)
- **FR-033**: System MUST namespace admin-specific UI components under `packages/ui/admin/*` and user-specific UI components under `packages/ui/user/*`
- **FR-034**: System MUST define shared database schema entities (e.g., `Project`, `Environment`) accessible to both admin and user contexts with RLS policies governing access level
- **FR-035**: System MUST use shared API client (`packages/api-client`) with conditional base URL and token type injection based on `APP_TYPE` environment variable

#### Template Propagation

- **FR-036**: CloudMake platform MUST include dual auth architecture in monorepo template used for all generated projects (for both CloudMake's own apps and user-generated projects)
- **FR-037**: Template MUST include pre-configured Neon Auth setup in `apps/admin-web/auth/` and `apps/admin-mobile/auth/` with NO billing integration
- **FR-038**: Template MUST include pre-configured Better Auth setup in `apps/user-web/auth/` and `apps/user-mobile/auth/` with Polar integration (Polar Hono library for web, Expo-Polar connection for mobile)
- **FR-039**: Template MUST include database migration scripts for RLS policies, admin tables, user tables, and Polar customer linkage in `apps/api/db/migrations/`
- **FR-040**: Template MUST include example admin routes (`/admin/users`, `/admin/analytics`) with NO billing UI and user routes (`/dashboard`, `/settings`, `/billing`) with Polar subscription management UI
- **FR-041**: CloudMake MUST provide CLI command `pnpm exec cloudmake sync-auth` to pull latest auth architecture updates from template into existing projects
- **FR-042**: Template MUST include Polar webhook handlers in `apps/api/src/routes/webhooks/polar.ts` for processing subscription events (created, updated, canceled) using Polar Hono library

#### Expo-Specific Requirements

- **FR-043**: Admin mobile app MUST use Expo Secure Store to persist admin session tokens with key prefix `admin_session_` with NO billing data cached
- **FR-044**: Standard user mobile app MUST use Expo Secure Store to persist user session tokens with key prefix `user_session_` and Polar customer ID with key prefix `polar_customer_`
- **FR-045**: Admin mobile app MUST support deep links matching `admin.cloudmake.dev/admin/*` pattern and navigate to corresponding screens
- **FR-046**: Standard user mobile app MUST support deep links matching `app.cloudmake.dev/*` pattern and navigate to corresponding screens, including billing deep links (`/billing`, `/subscription`)
- **FR-047**: Both mobile apps MUST handle biometric authentication failures by falling back to password-based auth with user notification
- **FR-048**: Both mobile apps MUST implement token refresh logic to refresh session tokens before expiration without requiring re-authentication
- **FR-049**: Standard user mobile app MUST use Expo-Polar connection to present native payment sheet for subscription purchases and upgrades
- **FR-050**: Standard user mobile app MUST validate in-app purchase receipts with Polar backend and sync subscription status to user session
- **FR-051**: Standard user mobile app MUST display subscription status (active, canceled, past_due) fetched from Polar API in billing screen
- **FR-052**: Admin mobile app MUST NOT include Polar SDK or billing-related dependencies in build to minimize bundle size and reduce attack surface

#### MCP Integration

- **FR-053**: System MUST provide configuration for connecting AI agents to the official Polar MCP server (public documented endpoint) for standard user billing insights; admin contexts MUST NOT register Polar MCP server.
- **FR-054**: System MUST expose Better Auth MCP server configuration in template enabling AI agents to query auth states (non-sensitive) and generate standardized onboarding instructions via published MCP endpoint; production usage MUST exclude any tools returning PII beyond user IDs and roles.
- **FR-055**: System MUST integrate Neon MCP server capabilities (project management, branch management, schema diff, read-only querying) with an environment-aware mode: development enables full toolset; staging/prod MUST default to read-only mode.
- **FR-056**: Template provisioning MUST populate `mcp/config.json` with Polar, Better Auth, and Neon server entries plus tool descriptor placeholders aligned with published server capabilities (billing, authentication, database operations).
- **FR-057**: MCP context isolation MUST prevent: (a) admin MCP sessions from invoking Polar billing tools; (b) user MCP sessions from invoking admin-only audit or admin session tools; (c) Neon write/migration tools outside development branches (whitelist: feature/*, dev).
- **FR-058**: System MUST provide a flag to enable Neon MCP read-only mode (`x-read-only`) for staging/prod environments and document activation in generated spec.
- **FR-059**: MCP server registration during template provisioning MUST complete within ≤5 seconds cumulative (all three servers) under normal network conditions.
- **FR-060**: MCP tool failures MUST surface standardized error envelope codes (e.g., `MCP_NEON_TOOL_ERROR`, `MCP_POLAR_UNAVAILABLE`, `MCP_AUTH_RATE_LIMIT`) without exposing stack traces or raw provider errors.
- **FR-061**: Each MCP tool invocation (Polar, Better Auth, Neon) MUST be audit logged with: tool name, server, actor (admin/user/system), durationMs, success boolean, resource identifiers (non-sensitive), and correlationId.
- **FR-062**: System MUST run nightly consistency validation ensuring `mcp/config.json` tool list matches upstream MCP server advertised tools; drift MUST trigger alert event logged to `admin_audit_logs` with diff summary.

#### Extended Integrations & Multi-MCP Ecosystem

- **FR-063**: System MUST integrate Cloudflare MCP (Workers, Pages deploy status, KV, D1, Images, Stream) with environment-based permission sets: development full access; staging/prod restricted to read + media retrieval.
- **FR-064**: System MUST expose Cloudflare Stream endpoints (upload, list, playback token retrieval) via template with billing isolation (admin can audit, users consume) and MCP tools limited to non-destructive playback in prod.
- **FR-065**: System MUST provide Cloudflare Images transformation capabilities (preset sizes, WebP/AVIF) through MCP tools; transformations MUST enforce alt text metadata presence for accessibility logging.
- **FR-066**: System MUST integrate OneSignal notifications (broadcast, segment, user-target) with MCP tools available only to admin context; user context limited to subscription preference retrieval.
- **FR-067**: System MUST integrate PostHog analytics MCP for feature flags and aggregate event queries; production mode MUST be read-only (no event deletion) and user context limited to self-related usage summaries.
- **FR-068**: System MUST integrate GitHub MCP for repository and issue management with write operations confined to development branches (feature/*) and read-only listing in staging/prod.
- **FR-069**: System MUST integrate Postman MCP for collection synchronization and contract test execution in dev/staging; production limited to contract validation and collection read.
- **FR-070**: System MUST integrate Mapbox (API, SDK, MCP if available) enabling marketing page map embed configuration and in-app interactive maps with style listing and geocoding tools; admin context manages global styles, user context manages personal map tokens.
- **FR-071**: System MUST securely store user-provided Mapbox access tokens with RLS isolation; tokens never exposed in clear via MCP responses (return partial hash + scopes).
- **FR-072**: System MUST bundle framework-oriented MCP context rules (React, Next.js, Hono, Drizzle, Postgres) for agent guidance without prescribing implementation, ensuring they are version-pinned and drift-validated weekly.
- **FR-073**: System MUST segment MCP configuration per environment: development includes experimental servers; staging excludes experimental write tools; production excludes experimental servers and enforces read-only for Neon, Cloudflare write categories, GitHub mutation tools.
- **FR-074**: System MUST enforce per-server rate limits (default: 60 tool invocations/min/server, burst 120) with 429 responses containing `Retry-After` and logged quota consumption metrics.
- **FR-075**: System MUST implement output sanitization of MCP tool responses removing secrets (API keys, bearer tokens) and replacing with `<REDACTED>` while preserving structural validity.
- **FR-076**: System MUST provide CLI command `pnpm exec cloudmake sync-mcp` to refresh MCP server configuration, validate tool drift, and emit summary (added, removed, changed) with duration.
- **FR-077**: System MUST perform nightly external MCP server health checks (availability %, p95 latency) for Polar, Better Auth, Neon, Cloudflare, GitHub, Postman, Mapbox and log results with trend deltas.
- **FR-078**: System MUST provide graceful degradation: if an MCP server is unreachable for >60s, surface remediation guidance (fallback API/SDK instructions) and record outage event including server name and impact scope.

### Key Entities

#### User
- **Attributes**: `id` (UUID), `email`, `role` (enum: `admin` | `user`), `created_at`, `updated_at`, `neon_auth_id` (nullable, for admins), `better_auth_id` (nullable, for users)
- **Relationships**: Has many `user_sessions` or `admin_sessions` depending on role; admins have access to all entities, users see only their own records
- **RLS Policy**: Standard users see only records where `user_id = auth.uid()`, admins see all records

#### AdminSession
- **Attributes**: `id` (UUID), `user_id` (FK to users), `token_hash`, `expires_at`, `created_at`, `ip_address`, `user_agent`
- **Relationships**: Belongs to one `User` with `role=admin`
- **RLS Policy**: Accessible only to admins (`users.role = 'admin'`)

#### UserSession
- **Attributes**: `id` (UUID), `user_id` (FK to users), `token_hash`, `expires_at`, `created_at`, `ip_address`, `user_agent`, `polar_customer_id` (required for standard users), `subscription_tier` (enum: free, pro, enterprise), `subscription_status` (enum: active, canceled, past_due, trialing)
- **Relationships**: Belongs to one `User` with `role=user`
- **RLS Policy**: Accessible only to session owner (`user_id = auth.uid()`)

#### PolarCustomer (standard user billing entity)
- **Attributes**: `id` (UUID), `user_id` (FK to users), `polar_customer_id` (external Polar customer ID), `subscription_tier`, `subscription_status`, `current_period_end`, `created_at`, `updated_at`
- **Relationships**: Belongs to one `User` with `role=user`
- **RLS Policy**: Accessible only to customer owner (`user_id = auth.uid()`) OR admins (`users.role = 'admin'`)

#### AdminAuditLog
- **Attributes**: `id` (UUID), `admin_user_id` (FK to users), `action_type` (enum), `entity_type`, `entity_id`, `changes_json`, `ip_address`, `created_at`
- **Relationships**: Belongs to one `User` with `role=admin`
- **RLS Policy**: Accessible only to admins

#### Project (shared entity example)
- **Attributes**: `id` (UUID), `name`, `owner_id` (FK to users), `created_at`, `updated_at`
- **Relationships**: Belongs to one `User` (can be admin or standard user)
- **RLS Policy**: Admins see all projects, standard users see only projects where `owner_id = auth.uid()` OR projects explicitly shared with them

## Success Criteria

### Measurable Outcomes

- **SC-001**: Admin users can authenticate on admin portal (web and mobile) using Neon Auth with MFA within 30 seconds of receiving login credentials
- **SC-002**: Standard users can authenticate on user app (web and mobile) using Better Auth (email/password or OAuth) within 45 seconds of starting registration flow
- **SC-003**: Database RLS policies prevent 100% of unauthorized cross-role queries (standard users cannot query `admin_audit_logs`, standard users see only their own `user_sessions`)
- **SC-004**: Admin portal is accessible only on `admin.` subdomain; attempts to access admin routes from main domain return HTTP 403 Forbidden
- **SC-005**: Standard users cannot access admin routes; attempts return HTTP 403 Forbidden within 50ms (middleware rejection before database query)
- **SC-006**: Admin actions are logged to `admin_audit_logs` with 100% capture rate (every admin CRUD operation on users, projects, config)
- **SC-007**: System supports 10,000 concurrent standard user sessions and 100 concurrent admin sessions without database connection pool exhaustion
- **SC-008**: Mobile apps (admin and user) persist authentication state securely using Expo Secure Store; tokens survive app restarts with <200ms token retrieval latency
- **SC-009**: Generated projects from CloudMake template include functional dual auth architecture; running `pnpm dev` starts all four apps (admin web/mobile, user web/mobile) without manual configuration
- **SC-010**: Token type mismatch (e.g., admin token to user API) is rejected in <10ms at middleware layer before reaching business logic
- **SC-011**: Biometric authentication on mobile apps has >95% success rate on supported devices; fallback to password auth works on 100% of devices
- **SC-012**: Polar integration provides billing context in standard user sessions within 3 seconds of user authentication; admin sessions never include billing data
- **SC-013**: Standard user web app processes Polar checkout sessions via Polar Hono library with <500ms endpoint response time
- **SC-014**: Standard user mobile app displays native payment sheet via Expo-Polar connection within 1 second of user tapping "Upgrade" button
- **SC-015**: Polar webhook events (subscription created, updated, canceled) are processed and reflected in user sessions within 5 seconds of webhook delivery
- **SC-016**: Generated projects from CloudMake template include functional Polar integration for standard user apps; admin apps have zero billing-related code or dependencies
- **SC-017**: 100% of MCP server registrations (Polar, Better Auth, Neon) succeed during template provisioning or emit actionable remediation guidance within 30 seconds.
- **SC-018**: Neon MCP read-only mode enforced in staging/prod: zero write/migration tool invocations recorded (violation count = 0 over 30-day window).
- **SC-019**: MCP audit logging coverage is 100% (every tool invocation produces a log entry with durationMs).
- **SC-020**: Tool descriptor drift (missing/extra tools vs upstream) is detected and resolved (config updated) within 24h of upstream change.
- **SC-021**: 95% of simple list operations (e.g., `list_projects`, `list_subscriptions`, `list_users`) via MCP complete <1000ms round-trip in development environment.
- **SC-022**: Zero unauthorized cross-context MCP operations (no admin-only audit tool invoked by user context, no billing tool invoked by admin context, no Neon write tool outside development branches) over 30-day observation.
- **SC-023**: Multi-MCP provisioning success rate ≥99% (Cloudflare, GitHub, Postman, OneSignal, PostHog, Mapbox, framework rules) on initial template generation; failures produce remediation guide within 30 seconds.
- **SC-024**: Marketing page Mapbox embed achieves LCP <1.5s and in-app interactive map becomes responsive (<2s) for 95% of sessions.
- **SC-025**: Cloudflare Stream video playback start time <2s (p95) for encoded assets served through template player component.
- **SC-026**: Cloudflare Images transformations return optimized variants (<200KB standard preview) within 700ms (p95) and 100% include alt text metadata.
- **SC-027**: OneSignal notification dispatch acknowledges server receipt <1s (p95) with 100% audit logging coverage of admin-triggered sends.
- **SC-028**: Aggregate MCP tool invocation error rate (non-permission) <2% over rolling 7-day window; permission denials separately tracked.
- **SC-029**: Weekly framework MCP context rule drift resolved within 24h (React, Next.js, Hono, Drizzle, Postgres) maintaining version parity.
- **SC-030**: Rate limit compliance: ≥99% of tool invocations remain within quota; excess receives 429 with accurate `Retry-After` and logged event.
- **SC-031**: PostHog aggregate analytics queries via MCP (feature flags & event counts) complete <1200ms (p95) in production read-only mode.
- **SC-032**: Graceful degradation engages within 5s of detecting unreachable MCP server (>60s outage) presenting fallback guidance with 100% outage event logging.
