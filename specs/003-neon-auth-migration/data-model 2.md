# Data Model: Neon Auth

## Entities

### User
- id: uuid (pk)
- email: text (unique, nullable for provider-only accounts if allowed)
- emailVerifiedAt: timestamp (nullable)
- displayName: text (nullable)
- avatarUrl: text (nullable)
- createdAt: timestamp
- updatedAt: timestamp

### IdentityProviderLink
- id: uuid (pk)
- userId: uuid (fk → User)
- provider: enum('apple','google','github','password')
- subject: text (provider user id / sub)
- emailAtProvider: text (nullable)
- createdAt: timestamp
- updatedAt: timestamp
- unique(provider, subject)

### Session
- id: uuid (pk)
- userId: uuid (fk → User)
- refreshTokenHash: text
- accessExpiresAt: timestamp
- refreshExpiresAt: timestamp
- deviceInfo: jsonb (nullable)
- createdAt: timestamp
- updatedAt: timestamp
- revokedAt: timestamp (nullable)
- indexes: userId, refreshTokenHash

### OAuthState (server-side short-lived)
- id: uuid (pk)
- state: text (random)
- codeVerifier: text (PKCE)
- provider: enum
- redirectUri: text
- expiresAt: timestamp
- createdAt: timestamp
- unique(state)

## Relationships
- User 1—N IdentityProviderLink
- User 1—N Session

## Validation Rules
- Email format for Email+Password flow; strong password policy (future)
- Session expirations: access (~15m), refresh (24h), rotate on refresh
- Revoke on logout or when refresh token is reused (token theft mitigation)

## Environment Strategy
- Same schema across dev/staging/prod Neon branches
- Idempotent migrations via Drizzle

