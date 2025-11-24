# Quickstart: Neon Auth + Expo Mobile + Codemagic CI/CD

This guide sets up mobile auth (Apple, Google, GitHub, Email+Password) backed by Neon via Hono on Cloudflare Workers, with Codemagic orchestrating Expo builds and deployments.

## Prerequisites
- Neon project with dev/staging/prod branches
- Cloudflare account and Workers deployment for `apps/api`
- Expo environment (iOS/Android) with expo-cli or EAS
- Provider apps configured (Apple, Google, GitHub) per environment
- Codemagic account with repository linked and workflows configured

## Configure Secrets (per environment)

Set the following via GitHub/Cloudflare secrets; rely on Feature 002 secrets sync for propagation:
- AUTH_JWT_SIGNING_KEY
- OAUTH_APPLE_CLIENT_ID, OAUTH_APPLE_TEAM_ID, OAUTH_APPLE_KEY_ID, OAUTH_APPLE_PRIVATE_KEY
- OAUTH_GOOGLE_CLIENT_ID, OAUTH_GOOGLE_CLIENT_SECRET
- OAUTH_GITHUB_CLIENT_ID, OAUTH_GITHUB_CLIENT_SECRET
- NEON_DATABASE_URL (serverless, per-branch)

Never commit secret values.
### OAuth Provider Secrets (Feature 002 Integration)

**Secret Naming Convention** (aligned with Feature 002 GitHub Secrets Sync):

All OAuth secrets below should be added to GitHub Secrets (Actions scope) and synced to Codespaces/Dependabot scopes via Feature 002's secret sync endpoints.

**Apple Sign-In**:
- `OAUTH_APPLE_CLIENT_ID` - Service ID from Apple Developer Portal (e.g., `com.flaresmith.mobile`)
- `OAUTH_APPLE_TEAM_ID` - 10-character Apple Team ID
- `OAUTH_APPLE_KEY_ID` - 10-character Key ID for Sign in with Apple private key
- `OAUTH_APPLE_PRIVATE_KEY` - P8 private key file contents (PEM format)

**Google Sign-In**:
- `OAUTH_GOOGLE_CLIENT_ID` - OAuth 2.0 Client ID from Google Cloud Console (ends with `.apps.googleusercontent.com`)
- `OAUTH_GOOGLE_CLIENT_SECRET` - OAuth 2.0 Client Secret

**GitHub OAuth App**:
- `OAUTH_GITHUB_CLIENT_ID` - OAuth App Client ID from GitHub Developer Settings
- `OAUTH_GITHUB_CLIENT_SECRET` - OAuth App Client Secret

**JWT & Session Management**:
- `AUTH_JWT_SIGNING_KEY` - HS256 signing key for access/refresh tokens (rotated via `scripts/security/rotateJwtKey.ts`)
- `AUTH_JWT_SIGNING_KEY_OLD` - Previous signing key (7-day grace period during rotation)

**Database**:
- `NEON_DATABASE_URL` - Neon serverless connection string per branch (dev/staging/prod)

**Feature 002 Sync Process**:
1. Add all OAuth secrets to GitHub repository secrets (Actions scope)
2. Run `POST /api/github/secrets/sync` with `projectId` to propagate to Codespaces/Dependabot
3. Secrets automatically appear in GitHub Environments (dev/staging/prod) via Feature 002's environment provisioning
4. Cloudflare Workers binds secrets from Cloudflare dashboard (manual until automation implemented)
5. Validation: Run `POST /api/github/secrets/validate` to confirm all required secrets present across scopes

**Verification**:
```bash
# Check secret sync status
curl -X GET "https://api.flaresmith.dev/api/github/secrets/sync/status?projectId=<uuid>" \
  -H "Authorization: Bearer <token>"

# Expected response: lastSyncAt, status="synced", pendingCount=0
```


## Redirect URIs (Example)
- Dev: `exp://127.0.0.1:19000` or Expo proxy; custom scheme `yourapp://`
- Staging: `https://staging.api.example.com/api/auth/oauth/callback`
- Prod: `https://api.example.com/api/auth/oauth/callback`

Also configure app scheme for mobile deep linking: `yourapp://auth-callback`.

## Run Locally

- API: Cloudflare Workers (wrangler) for `apps/api`. Ensure env bindings are set (see wrangler.toml) and Neon URL points to dev branch.
- Mobile: `apps/mobile` with Expo, configured providers and redirect scheme.

### Mobile App Setup (Detailed)

1. **Environment Variables**: Create `.env` in `apps/mobile/` with:
  ```bash
  EXPO_PUBLIC_API_URL=http://localhost:8787  # Dev API
  ```

2. **Install Dependencies**:
  ```bash
  cd apps/mobile
  pnpm install
  ```

3. **Configure App Scheme** in `app.json`:
  ```json
  {
    "expo": {
     "scheme": "flaresmith",
     "ios": {
      "bundleIdentifier": "com.flaresmith.app"
     },
     "android": {
      "package": "com.flaresmith.app"
     }
    }
  }
  ```

4. **Run Development Server**:
  ```bash
  pnpm start
  # Or: pnpm ios / pnpm android
  ```

5. **Test Authentication**:
  - Email/Password: Enter credentials on sign-in screen
  - OAuth: Tap provider button → opens browser → redirects back to app
  - Persistence: Close app, reopen → should restore session automatically

## Mobile Sign-In Flow (Implementation Details)

### Email + Password

1. User enters email/password on `apps/mobile/app/(auth)/signin.tsx`
2. Calls `useAuthContext().login({ email, password })` or `.register()`
3. `useAuth` hook (`apps/mobile/src/hooks/useAuth.ts`) calls API client
4. API returns `AuthResponse` with accessToken + refreshToken
5. Tokens stored via `expo-secure-store` (`apps/mobile/src/auth/storage.ts`)
6. `useAuth` updates state → route guard redirects to main app
7. Background refresh scheduled before access token expires (60s buffer)

### OAuth (Apple/Google/GitHub)

1. User taps provider button on sign-in screen
2. Screen generates PKCE code_challenge using `expo-crypto`
3. Opens browser with `WebBrowser.openAuthSessionAsync()` to `/api/auth/oauth/{provider}`
4. User authorizes → provider redirects to callback URL with code
5. App catches redirect, extracts code + state
6. Exchanges code for tokens via `/api/auth/oauth/callback` (API validates PKCE)
7. Tokens stored and state updated (same as email flow)

### Session Restoration

1. On app launch, `useAuth` effect checks `expo-secure-store`
2. If refresh token found and not expired:
  - Checks if access token expired → auto-refresh if needed
  - Restores auth state without login screen
3. If no valid session → route guard redirects to `/(auth)/signin`

### Token Refresh

- **Automatic**: Timer set 60s before access token expiry
- **Manual**: On API 401 response (not yet implemented)
- **Rotation**: Server issues new access + refresh tokens, old refresh invalidated
- **Storage**: Updated tokens replace old ones in `expo-secure-store`

### Sign-Out

1. User action calls `useAuth().logout()`
2. Clears all tokens from `expo-secure-store`
3. Optionally calls `/api/auth/signout` (best effort, doesn't block)
4. Resets state → route guard redirects to sign-in

## CI/CD with Codemagic

- Configure `codemagic.yaml` with per-environment workflows (dev/staging/prod).
- Each workflow:
  - Triggers on branch push (feature/* → dev, staging → staging, main → prod)
  - Injects environment-specific secrets
  - Runs `eas build` for native compilation
  - Publishes via `expo publish` or Expo Launch
  - Surfaces build logs and deployment status in Codemagic dashboard
- Example dev workflow snippet:
  ```yaml
  workflows:
    dev-build:
      name: Dev Build
      triggering:
        events:
          - push
        branch_patterns:
          - pattern: 'feature/*'
      environment:
        groups:
          - dev_secrets
      scripts:
        - name: Install dependencies
          script: pnpm install
        - name: Build with EAS
          script: eas build --platform all --profile dev --non-interactive
        - name: Deploy
          script: expo publish --release-channel dev
  ```

## Flows

- Email + Password: POST `/api/auth/register` then `/api/auth/login`; store refresh token in `expo-secure-store`, keep access token in memory.
- OAuth (Apple/Google/GitHub): Start with expo-auth-session; server validates `state` + PKCE on `/api/auth/oauth/callback` and issues session.
- Refresh: POST `/api/auth/refresh` before access expiry or on 401; rotate refresh token.
- Sign-out: Delete local credentials and call server revocation endpoint (to be added) or rely on refresh rotation invalidation.

## Validation
- Confirm login and refresh in dev environment.
- Validate no secret values in logs; check structured logs include correlationId.
- Confirm route guarding in app uses access token validity.

## Troubleshooting

### Mobile App Issues

**Sign-in screen doesn't appear on launch**
- Check AuthProvider is wrapping app in `_layout.tsx`
- Verify route guard logic in RootLayoutNav component
- Clear expo-secure-store: Delete app and reinstall

**OAuth redirect fails (browser doesn't return to app)**
- Verify app scheme matches `app.json` (`expo.scheme`)
- Check redirect URI in provider console matches `flaresmith://auth/callback`
- iOS: Ensure URL scheme registered in Info.plist (Expo handles automatically)
- Android: Check intent filter in AndroidManifest.xml

**Token refresh fails silently**
- Check API logs for AUTH_TOKEN_EXPIRED or AUTH_REFRESH_REUSED errors
- Verify refresh token not expired (24h window)
- Check correlation IDs in logs to trace request flow

**Session doesn't persist after app restart**
- Verify expo-secure-store permissions (iOS: Keychain, Android: EncryptedSharedPreferences)
- Check storage.ts functions don't throw errors
- Enable console logs in useAuth hook to see restoration flow

**"useAuthContext must be used within AuthProvider" error**
- Ensure component is inside AuthProvider in _layout.tsx
- Check import path: `import { useAuthContext } from "../src/contexts/AuthProvider"`

### API Issues

**AUTH_INVALID_CREDENTIALS on login**
- Verify user exists in database (check via Neon console or API logs)
- Check password hashing algorithm matches (PBKDF2, 100k iterations)
- Ensure email case matches (DB stores lowercase)

**AUTH_STATE_INVALID on OAuth callback**
- Check oauth_state table for matching state entry
- Verify state not expired (5min TTL)
- Ensure state parameter passes through redirect correctly

**CORS errors in mobile dev**
- Check Cloudflare Workers CORS middleware includes mobile origins
- For Expo dev: Allow `http://localhost:*` and `exp://*`

### Database Issues

**Migration 003-001 fails**
- Run migration script: `./scripts/db/runMigration.sh dev`
- Set DATABASE_URL: `export DEV_DATABASE_URL="postgresql://..."`
- Check auth tables exist: `SELECT * FROM pg_tables WHERE schemaname = 'public';`

**Session tokens not found**
- Verify sessions table populated: `SELECT COUNT(*) FROM sessions;`
- Check refresh_token_hash column exists (SHA-256 digest)
- Ensure user_id foreign key references users.id

## Implementation File Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| Sign-in screen | `apps/mobile/app/(auth)/signin.tsx` | OAuth + email/password UI |
| Auth hook | `apps/mobile/src/hooks/useAuth.ts` | Session management |
| Storage helpers | `apps/mobile/src/auth/storage.ts` | expo-secure-store wrapper |
| Auth context | `apps/mobile/src/contexts/AuthProvider.tsx` | Global auth state |
| Route guard | `apps/mobile/app/_layout.tsx` | Protected navigation |
| API client | `packages/api-client/src/resources/auth.ts` | Typed auth methods |
| API routes | `apps/api/src/routes/auth/` | Login, register, refresh, OAuth |
| Auth service | `apps/api/src/services/auth/authService.ts` | Session CRUD |
| DB schema | `apps/api/db/schema/{authSession,identityProviderLink,oauthState}.ts` | Drizzle models |
| Migration | `apps/api/db/migrations/003-001-create-auth-tables.sql` | Database setup |

## Metrics (Auth)

Phase 7 metrics instrumentation provides observability for auth flows:

| Metric | Description |
|--------|-------------|
| auth_sign_in_attempts_total | Registration + login + OAuth attempts |
| auth_sign_in_success_total | Successful sign-ins (email/password + OAuth) |
| auth_refresh_success_total | Successful refresh operations |
| auth_sign_out_total | Single-session signouts |
| auth_sign_out_all_total | Global signouts (all sessions revoked) |
| auth_latency_ms | Histogram of auth route latencies (seconds buckets) |

Snapshot usage:
```ts
import { getMetricsSnapshot } from 'apps/api/src/lib/metrics';
console.log(getMetricsSnapshot());
```

Validate latency percentiles by inspecting histogram buckets; P95 should remain < 2s for sign-in (SC-001) and < 2s for restoration (SC-002).
