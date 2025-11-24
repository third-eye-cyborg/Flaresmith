# Feature Specification: Neon Auth Migration (Mobile + Project)

**Feature Branch**: `003-neon-auth-migration`  
**Created**: 2025-11-23  
**Status**: Draft  
**Input**: User description: "migrate from betterauth to neon auth and use expo auth tools for mobile auth to neon auth. Codemagic will orchestrate CI/CD workflows that leverage Expo's build and deployment capabilities (EAS Build, Expo Launch)."

## User Scenarios & Testing (mandatory)

### User Story 1 - Mobile sign-in with OAuth (Priority: P1)

A mobile user opens the app, chooses a sign-in provider, completes a standard OAuth flow, and is returned to the app signed in. The app securely persists credentials and protects routes based on sign-in state.

**Why this priority**: Enables core access to the product from mobile; without sign-in, the app is not usable.

**Independent Test**: Install the app on a clean device, complete the OAuth flow end-to-end, close and reopen the app, and confirm the user remains signed in and can access protected screens.

**Acceptance Scenarios**:

1. Given the app is installed and the user is signed out, When the user initiates sign-in and completes provider authorization, Then the app displays the authenticated home screen with user profile visible.
2. Given the user has completed sign-in, When the app is restarted without network connectivity, Then the app continues to show protected screens as long as the session is still valid and later syncs state when online.
3. Given the user is signed in, When they visit a protected route directly, Then access is granted without additional prompts as long as the session is valid.

---

### User Story 2 - Session refresh and sign-out (Priority: P2)

An authenticated mobile user’s session silently refreshes before expiry and can be explicitly revoked via sign out. Upon sign out, protected routes are no longer accessible.

**Why this priority**: Ensures a stable, low-friction experience and proper security boundaries.

**Independent Test**: Shorten token lifetime in a test environment, observe automatic refresh prior to expiry, and verify explicit sign out invalidates access immediately.

**Acceptance Scenarios**:

1. Given a valid session, When the session approaches expiry, Then a refresh occurs without interrupting the user experience and protected routes stay available.
2. Given the user is signed in, When the user selects sign out, Then all credentials are cleared and protected routes are no longer accessible until re-authentication.

---

### User Story 3 - Cutover and finalize CI/CD integration (Priority: P3)

There are no current users on the legacy system. The team removes BetterAuth components, configures Codemagic workflows to orchestrate Expo builds and deployments (EAS Build, Expo Launch), verifies clean builds/deployments, and confirms that the new sign-in flow works in all environments.

**Why this priority**: Ensures a clean cutover with modern CI/CD orchestration layered over Expo's native capabilities, reducing complexity while maintaining automation.

**Independent Test**: Remove BetterAuth references, configure Codemagic to trigger Expo builds/deployments, run a full build and deployment pipeline, and verify new-user sign-in works in dev, staging, and production.

**Acceptance Scenarios**:

1. Given BetterAuth code and configuration exist, When they are removed and Codemagic workflows are updated to use Expo commands, Then builds and deployments succeed without reference to BetterAuth.
2. Given Codemagic is configured to orchestrate Expo builds, When a build is triggered, Then Codemagic successfully invokes EAS Build/Expo Launch and artifacts are deployed to test environments.
3. Given the new authentication system is active, When a new user signs in on each environment, Then sign-in succeeds and protected routes are accessible, with no BetterAuth dependencies involved.

---

### Edge Cases

- Network interruptions during the authorization redirect or callback
- Stale or revoked sessions encountered while the app is offline
- Provider denial or consent changes mid-flow
- Multiple devices or concurrent sessions for the same user
- Clock skew between client and server affecting session validity
- Organization policy changes (e.g., provider disabled) during sign-in

### Scope & Out of Scope

- In Scope: Mobile client sign-in/refresh/sign-out, protected route gating, replacement of legacy authentication dependencies, and continuity for existing users.
- Out of Scope: Administrative UI for identity management, web-specific UI changes, and non-auth related mobile features.

## Requirements (mandatory)

### Functional Requirements

- FR-001: The system MUST provide a secure user sign-in flow using an industry-standard authorization protocol suitable for mobile clients.
- FR-002: The system MUST securely persist credentials on-device and prevent unauthorized access to protected routes without a valid session.
- FR-003: The system MUST support token/session refresh without disrupting the user experience.
- FR-004: The system MUST provide explicit sign-out that revokes local credentials and prevents access to protected routes.
- FR-005: The system MUST provide endpoints for sign-in initiation, account creation where applicable, session refresh, and authorization callback handling.
- FR-006: The system MUST store user identities and sessions in the primary database, enabling environment parity (dev, staging, prod).
- FR-007: The system MUST remove dependencies on the legacy authentication provider (BetterAuth) while retaining Codemagic as the CI/CD orchestration layer over Expo.
- FR-008: The system MUST provide a migration path for existing users so their data remains accessible post-cutover.
- FR-009: The system MUST ensure that all sensitive values are never logged in plaintext and that observability includes correlation identifiers for auth events.
- FR-010: The system MUST provide a mechanism to invalidate sessions across devices when required (e.g., user-initiated sign out on one device).
- FR-011: The system SHOULD provide a way to detect and handle provider unavailability with user-friendly messaging and retry guidance.
- FR-012: The system SHOULD support the following providers at launch: Apple, Google, GitHub, and Email + Password, and allow future additions without breaking existing accounts.
- FR-013: There are no current legacy users; the system MUST remove BetterAuth authentication components entirely without requiring any account linking.
- FR-014: The system MUST enforce session lifetimes of approximately 15 minutes for access and 24 hours for refresh, with silent refresh when possible.

### Key Entities

- User: Represents an individual end-user with one or more identity provider links and associated profile attributes.
- Session: Represents an authenticated context with validity windows and refresh capability; may be present concurrently across devices.
- Identity Provider Link: Represents a connection between a user and an external provider identity (e.g., subject identifier), enabling re-authentication and account linking.

### Assumptions & Dependencies

- Assumes per-environment database availability and connectivity (dev, staging, prod) with consistent schemas.
- Assumes at least one identity provider is available and configured with required redirect URIs.
- Assumes mobile delivery uses Codemagic to orchestrate Expo build and deployment workflows (EAS Build, Expo Launch).
- Assumes legacy user records are exportable or discoverable for mapping/linking during first sign-in on the new system.

## Success Criteria (mandatory)

### Measurable Outcomes

- SC-001: A first-time mobile sign-in completes within 2 minutes for 95% of attempts under normal network conditions.
- SC-002: Returning users regain access to protected routes in under 2 seconds after app launch for 95% of attempts.
- SC-003: Session refresh succeeds silently in 99% of eligible cases without user intervention.
- SC-004: 0% of sensitive credential values appear in logs or error messages (complete redaction compliance).
- SC-005: 95% of first-attempt sign-ins for new users succeed without support intervention across all environments.
- SC-006: No dependencies on BetterAuth remain in any environment; Codemagic successfully orchestrates Expo builds and deployments across dev/staging/prod.
