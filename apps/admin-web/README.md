# CloudMake Admin Portal

**Admin-only web application** for platform management with isolated Neon Auth authentication and MFA enforcement.

---

## Architecture

### Authentication Isolation (FR-015, FR-018)

The admin portal uses **Neon Auth** exclusively:

- **Separate auth provider** from user-facing apps (which use Better Auth)
- **Token type enforcement** via `tokenType` and `adminBoundary` middleware
- **Database isolation** via `admin_sessions` table (separate from `user_sessions`)
- **MFA requirement** for all admin accounts (FR-016, SC-030)

### Key Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| `src/auth/neonClient.ts` | Admin authentication client | Neon Auth SDK |
| `app/admin/login/page.tsx` | Two-step login (credentials → MFA) | Next.js 14 App Router |
| `app/admin/dashboard/page.tsx` | Admin dashboard with stats | React Server Components |
| `app/admin/settings/mfa/page.tsx` | TOTP enrollment interface | QR code + manual secret |
| API: `/admin/auth/login` | Session issuance endpoint | Hono + Drizzle |
| API: `/admin/auth/mfaVerify` | TOTP verification endpoint | TOTP validation |
| API: `/admin/users` | User management endpoints | Role-gated queries |

---

## Development Setup

### Prerequisites

- Node.js 20.x
- pnpm 9.x
- PostgreSQL 16+ (Neon recommended)
- Configured Neon Auth application

### Environment Variables

Create `apps/admin-web/.env.local`:

```bash
# Neon Auth Configuration
NEXT_PUBLIC_NEON_AUTH_DOMAIN=auth.neon.tech
NEXT_PUBLIC_NEON_AUTH_CLIENT_ID=your_client_id
NEON_AUTH_CLIENT_SECRET=your_client_secret

# API Endpoints
NEXT_PUBLIC_API_URL=http://localhost:8787

# Database (Drizzle uses shared connection from monorepo root)
DATABASE_URL=postgresql://user:pass@host/db
```

### Local Development

```bash
# From monorepo root
pnpm install

# Run admin portal in development
cd apps/admin-web
pnpm dev

# Access at http://localhost:3001
```

**Note**: Admin portal runs on port **3001** (user web app uses 3000).

### First Admin User Setup

1. **Create admin user manually** in database:

```sql
INSERT INTO users (email, auth_role, neon_auth_id)
VALUES ('admin@your-domain.com', 'admin', 'neon-user-id-from-neon-console');
```

2. **Log in** at `/admin/login` with Neon Auth credentials
3. **Enroll MFA** at `/admin/settings/mfa` (scan QR code or enter secret)
4. **Subsequent logins** require TOTP code after password

---

## MFA Enrollment Flow (FR-016)

### Web Flow

1. Admin navigates to `/admin/settings/mfa`
2. Backend generates TOTP secret + QR code via `/admin/mfa/setup`
3. Admin scans QR code with authenticator app (Authy, Google Authenticator, 1Password)
4. Admin enters 6-digit code to verify setup
5. Backend validates code via `/admin/mfa/enable`
6. MFA marked as enabled in `users.mfa_enabled` column

### Mobile Flow

Same flow in `apps/admin-mobile/app/admin/mfa/setup.tsx`:

- Displays QR code image from API
- Provides manual secret entry fallback
- Validates setup code via API

### Login with MFA

```typescript
// Step 1: Login with email + password
const { mfaToken, requiresMfa } = await neonClient.login(email, password);

// Step 2: Verify TOTP code
const { accessToken, refreshToken } = await neonClient.verifyMfa(mfaToken, totpCode);
```

---

## Security Boundaries

### Token Type Enforcement (SC-019, SC-020)

**Admin tokens cannot access billing endpoints**:

```typescript
// apps/api/src/middleware/adminBoundary.ts
if (tokenType !== 'admin') {
  return c.json({ error: { code: 'AUTH_ADMIN_BOUNDARY_VIOLATION' } }, 403);
}
```

**User tokens cannot access admin endpoints**:

```typescript
// apps/api/src/middleware/userBoundary.ts (future)
if (tokenType !== 'user') {
  return c.json({ error: { code: 'AUTH_USER_BOUNDARY_VIOLATION' } }, 403);
}
```

### Audit Logging (FR-017)

All admin actions logged via `AdminAuditService`:

```typescript
import { AdminAuditService } from '@/services/audit/adminActions';

await AdminAuditService.logAction({
  userId: adminId,
  action: 'USER_ROLE_CHANGED',
  entityType: 'user',
  entityId: targetUserId,
  changes: { role: { from: 'user', to: 'admin' } },
  ipAddress: req.headers.get('cf-connecting-ip'),
  userAgent: req.headers.get('user-agent'),
});
```

Audit logs stored in `admin_audit_logs` table with:

- Timestamped action records
- IP address + user agent tracking
- JSON diff of changes (`{ from: oldValue, to: newValue }`)
- Entity type + ID linkage

---

## API Routes

### Authentication

| Endpoint | Method | Input | Output | MFA Required |
|----------|--------|-------|--------|--------------|
| `/admin/auth/login` | POST | `{ email, password }` | `{ mfaToken?, accessToken?, refreshToken? }` | N/A |
| `/admin/auth/mfaVerify` | POST | `{ mfaToken, code }` | `{ accessToken, refreshToken }` | Yes |
| `/admin/mfa/setup` | POST | (authenticated) | `{ qrCode, secret }` | No |
| `/admin/mfa/enable` | POST | `{ code }` | `{ success: true }` | No |

### User Management

| Endpoint | Method | Description | Middleware |
|----------|--------|-------------|------------|
| `/admin/users` | GET | List users with pagination + filters | `adminBoundary` |
| `/admin/users/:id` | GET | Get user details | `adminBoundary` |
| `/admin/users/:id/role` | PATCH | Change user role | `adminBoundary` + `auditLog` |
| `/admin/users/:id/disable` | POST | Disable user account | `adminBoundary` + `auditLog` |

### Audit Logs

| Endpoint | Method | Description | Middleware |
|----------|--------|-------------|------------|
| `/admin/audit/actions` | GET | List audit log entries | `adminBoundary` |
| `/admin/audit/users/:id` | GET | User-specific audit trail | `adminBoundary` |
| `/admin/audit/entities/:type/:id` | GET | Entity change history | `adminBoundary` |

---

## Testing

### Unit Tests

```bash
pnpm test
```

Tests located in `apps/api/tests/admin/`:

- `tokenMisuse.test.ts`: Validates SC-019, SC-020 (token boundary enforcement)
- `mfaFlow.test.ts`: TOTP enrollment + verification (future)
- `auditLog.test.ts`: Audit trail completeness (future)

### Manual Testing Checklist

- [ ] Admin login with MFA enabled → requires TOTP code
- [ ] Admin login with MFA disabled → direct token issuance
- [ ] User token attempt on `/admin/users` → 403 error
- [ ] Admin token attempt on `/billing/checkout` → 403 error
- [ ] MFA setup flow (web + mobile) → QR code scannable
- [ ] Audit log appears for user role change
- [ ] Session expiration → 401 on subsequent requests

---

## Deployment

### Production Checklist

- [ ] `NEON_AUTH_CLIENT_SECRET` set in Cloudflare secrets
- [ ] Database RLS policies applied (see `migrations/02_rls_policies.sql`)
- [ ] First admin user created via SQL migration
- [ ] MFA enrollment reminder displayed on first login
- [ ] Audit log retention policy configured (default: 2 years)

### Build

```bash
# From monorepo root
pnpm build

# Admin portal builds to .next/
cd apps/admin-web
pnpm build
```

Deploy via Cloudflare Pages or Vercel with Next.js adapter.

---

## Architecture Decisions

### Why Neon Auth for Admins?

- **Regulatory isolation**: Admin credentials stored separately from user data
- **MFA native support**: TOTP enrollment built into Neon Auth SDK
- **Audit compliance**: Separate auth provider = separate audit trail
- **Breach containment**: Compromise of user auth does not affect admin access

### Why Separate App Directory?

- **Code isolation**: Admin portal cannot accidentally import user-facing components
- **Deployment independence**: Admin portal can be deployed to restricted network
- **Permission boundaries**: Cloudflare Access can gate admin portal separately
- **Bundle size optimization**: Admin portal excludes user-facing dependencies (Polar, Mapbox)

### Why Token Type Middleware?

- **Defense in depth**: Prevents accidental route misuse during development
- **API clarity**: `/admin/*` routes are unambiguous in logs and monitoring
- **Future extensibility**: Supports additional token types (e.g., `service` for CI/CD)

---

## Future Enhancements

- [ ] RBAC granularity (viewer vs editor vs superadmin)
- [ ] Admin session activity log (IP changes, device fingerprints)
- [ ] Hardware security key support (WebAuthn)
- [ ] Admin API rate limiting (stricter than user endpoints)
- [ ] Admin portal analytics (PostHog with separate project ID)

---

## Related Documentation

- [Dual Auth Architecture Spec](../../../specs/005-dual-auth-architecture/spec.md)
- [Neon RLS Policies](../../api/db/migrations/02_rls_policies.sql)
- [Token Type Middleware](../../api/src/middleware/tokenType.ts)
- [Admin Boundary Middleware](../../api/src/middleware/adminBoundary.ts)
- [Admin Audit Service](../../api/src/services/audit/adminActions.ts)

---

**Security Contact**: For vulnerabilities in admin portal, see [SECURITY.md](../../../SECURITY.md).
