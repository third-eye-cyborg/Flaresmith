# Research: Neon Auth + Expo Mobile Auth Integration

## Decisions

- Auth Protocol: OAuth 2.0 + OIDC (where possible) for Apple/Google/GitHub; Email+Password via API with hashed passwords and session issuance.
- Mobile Auth SDKs: expo-auth-session for OAuth; expo-secure-store for device credential storage (access/refresh tokens or session key).
- Backend Runtime: Hono on Cloudflare Workers; Neon serverless driver (HTTP) via Drizzle ORM.
- Session Model: Short-lived access (~15m) + 24h refresh. Server-stored session (DB) with refresh token hash. Device can hold refresh token; access token kept short.
- Providers at Launch: Apple, Google, GitHub, Email + Password.
- Redirect/Deep Links: Use expo-auth-session redirect (Proxy + Custom URL scheme). Configure per platform and per environment.
- Token Storage: expo-secure-store for refresh token or session key; in-memory for access token. Never log secrets.
- Email+Password: Zxcvbn-strength checks (optional), bcrypt/scrypt/argon2id hashing (argon2id preferred if supported; fallback bcrypt), rate limiting on /login and /register.
- CSRF/State: OAuth `state` param stored server-side (short TTL); verify on callback; PKCE for public/mobile clients.
- CI/CD Orchestration: Codemagic orchestrates build and deployment workflows, invoking Expo's native services (EAS Build for builds, Expo Launch for deployments). Codemagic provides environment-specific triggers, secret injection, and pipeline visibility.

## Rationale

- expo-auth-session provides a proven OAuth UX on mobile with Expo; secure-store isolates long-lived credentials.
- Server-managed sessions allow rotation, revocation, and multi-device control while keeping access tokens short.
- Neon’s serverless driver fits Workers runtime; Drizzle gives typed models and migrations.
- Apple/Google/GitHub cover most use cases; Email+Password satisfies users without 3rd-party identity.

## Alternatives Considered

- Full JWT-only stateless auth with long-lived refresh JWTs stored on-device → harder global revocation and auditing.
- Third-party auth providers (Auth0/Supabase/Clerk) → external dependency, less control, cost.
- Using AsyncStorage for tokens → weaker security vs expo-secure-store.

## Provider Notes

- Apple: Requires Service ID, redirect URI, and iOS bundle ID; review guidelines around Apple Sign-in if other providers exist.
- Google: OAuth client IDs per platform; ensure reverse-client-id configuration for iOS.
- GitHub: App or OAuth app; set callback URLs per environment.
- Email+Password: Brute-force mitigation (rate limit, lockout, captcha as needed), password policy, and email verification flow (later phase).

## Security & Observability

- Redaction middleware covers tokens/keys. No secret values in logs. Structured logs include correlationId and auth flow stage.
- Refresh token stored hashed (e.g., SHA-256) in DB with salt; compare by hash. Rotate on each refresh.
- Device logout and global revocation handled by invalidating session rows and purging refresh token hashes.

## Environment & CI/CD

- Secrets configured per env via GitHub/Cloudflare; rely on existing Secrets Sync (feature 002) to converge across scopes.
- Preview environments: ensure redirect URIs include preview host when applicable; otherwise restrict OAuth to static dev/staging/prod hosts.
- Codemagic Workflows: Per-environment workflows (dev/staging/prod) configured in `codemagic.yaml`. Each workflow:
  - Checks out the appropriate branch
  - Injects environment-specific secrets (provider credentials, API keys, database URLs)
  - Invokes EAS Build to compile native binaries
  - Invokes Expo Launch or other deployment commands to publish builds to test/production channels
  - Provides logs, artifacts, and deployment status visibility
- Rationale: Codemagic acts as the orchestration and visibility layer, while Expo provides the native build/deployment primitives. This separation allows for centralized CI/CD control with flexible underlying tooling.

## Open Questions (Deferred)

- Email verification and MFA scope/timeline (future feature).  
- Device attribution (push-based logout) – out of scope for MVP.
