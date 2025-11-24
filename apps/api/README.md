# CloudMake API

Hono-based REST API deployed on Cloudflare Workers, providing orchestration for GitHub, Cloudflare, Neon, and Postman integrations.

## Architecture

### Dual Authentication System

The API implements a **dual authentication architecture** separating admin (Neon Auth) and user (Better Auth) contexts:

| Aspect | Admin (Neon Auth) | User (Better Auth) |
|--------|-------------------|-------------------|
| **Auth Provider** | Neon Auth | Better Auth |
| **Session Table** | `admin_sessions` | `user_sessions` |
| **Token Type** | JWT with `type: "admin"` | JWT with `type: "user"` |
| **Role** | `role = 'admin'` | `role = 'user'` |
| **Billing** | No billing context | Polar.sh integration |
| **Data Access** | Full database visibility | RLS-filtered (own records) |
| **Connection Pool** | Reserved 100 connections | Shared 1000 connections |

### Database Security Model

#### Row-Level Security (RLS) Policies

Postgres RLS policies enforce data isolation at the database layer:

**Admin-Only Tables**:
- `admin_sessions`: Only accessible with `role = 'admin'`
- `admin_audit_logs`: Only accessible with `role = 'admin'`

**User-Filtered Tables**:
- `user_sessions`: Users see only `WHERE user_id = auth.uid()`
- `polar_customers`: Users see only their own billing records
- `mapbox_tokens`: Users see only their own tokens
- `notification_preferences`: Users see only their own preferences

**Owner-or-Admin Tables**:
- `users`: Admins see all, users see only their own record
- `mcp_tool_invocations`: Actor sees own invocations, admins see all

**Migration**: `apps/api/db/migrations/005-003-rls-policies.sql`

#### Application-Layer RLS (Defense-in-Depth)

`RoleDataScopeService` (`src/services/security/roleDataScope.ts`) duplicates database-level RLS at application layer:

```typescript
import { RoleDataScopeService } from './services/security/roleDataScope';

const scopeService = new RoleDataScopeService();

// Get user's data access scope
const scope = await scopeService.getUserDataScope(db, userId);

// Apply RLS filter to query
const filteredQuery = scopeService.applyScopeFilter(
  scope, 
  db.select().from(polar_customers),
  'user_id'
);

// Enforce admin-only access
scopeService.adminOverride(scope); // throws if not admin

// Validate resource ownership
scopeService.validateResourceAccess(scope, resourceOwnerId);
```

**Key Methods**:
- `getUserDataScope(db, userId)`: Fetch role and access permissions
- `enforceRLS(scope, userIdColumn)`: Generate SQL filter for standard users
- `adminOverride(scope)`: Throw if not admin
- `applyScopeFilter(scope, query, userIdColumn)`: Apply filter to query builder
- `validateResourceAccess(scope, resourceOwnerId)`: Verify ownership or admin
- `getAuditContext(scope)`: Return admin_user_id for logging

### Connection Pool Segmentation

`ConnectionPoolManager` (`src/db/poolConfig.ts`) separates admin and user database connections:

```typescript
import { initializePoolManager, getConnectionForRole } from './db/poolConfig';

// Initialize on app startup
const DATABASE_URL = process.env.DATABASE_URL!;
initializePoolManager(DATABASE_URL);

// Get role-specific connection
const conn = await getConnectionForRole('admin'); // or 'user'
try {
  const result = await conn.sql`SELECT * FROM users`;
  // ... use result
} finally {
  conn.release(); // Release connection slot
}

// Monitor pool health
import { getConnectionPoolHealth } from './db/poolConfig';
const health = getConnectionPoolHealth();
console.log(health.stats);
// {
//   admin: { active: 5, max: 100, utilization: 5 },
//   user: { active: 250, max: 1000, utilization: 25 }
// }
```

**Configuration**:
- Admin pool: 100 max connections, 60s statement timeout, 5s connection timeout
- User pool: 1000 max connections, 30s statement timeout, 10s connection timeout
- Cleanup: Stale connections (>5min) removed every 5 minutes
- Monitoring: Utilization warnings at 80% (admin) and 90% (user)

**Why Segmentation?**:
- Prevents user query storms from starving admin operations
- Ensures admin queries always have reserved capacity
- Isolates blast radius of connection pool exhaustion

### Middleware Pipeline

Request flow through middleware layers:

1. **tokenType** (`src/middleware/tokenType.ts`): Extract and validate JWT token type (admin|user)
2. **roleGuard** (`src/middleware/roleGuard.ts`): Derive role from token, cache in request context
3. **adminBoundary** (`src/middleware/adminBoundary.ts`): Enforce admin-only routes (403 for users)
4. **auditLog** (`src/middleware/auditLog.ts`): Log admin actions to `admin_audit_logs`
5. **rateLimit** (`src/middleware/rateLimit.ts`): Token bucket rate limiting (admin: 120/min, user: 60/min)
6. **circuitBreaker** (via `@flaresmith/utils`): Fail-fast on integration errors

**Example Route Registration**:

```typescript
import { Hono } from 'hono';
import { adminBoundary } from '../middleware/adminBoundary';
import { auditLog } from '../middleware/auditLog';

const app = new Hono();

// Admin-only route
app.get('/admin/users', adminBoundary, auditLog, async (c) => {
  // Only admins reach this handler
  const users = await db.select().from(users);
  return c.json({ users });
});

// User route (no admin boundary)
app.get('/billing/subscription', async (c) => {
  // Both admins and users can access
  const userId = c.get('userId'); // from roleGuard
  const subscription = await db
    .select()
    .from(polar_customers)
    .where(eq(polar_customers.userId, userId))
    .limit(1);
  return c.json({ subscription: subscription[0] });
});
```

### Foreign Key Constraints

Migration `04_fk_constraints.sql` enforces referential integrity:

**CASCADE DELETE** (child records deleted with parent):
- `admin_sessions` → `users(admin_user_id)`
- `user_sessions` → `users(user_id)`
- `polar_customers` → `users(user_id)`
- `mapbox_tokens` → `users(user_id)`
- `notification_preferences` → `users(user_id)`
- `stream_playback_deny` → `users(user_id)`

**SET NULL ON DELETE** (preserve audit trail):
- `admin_audit_logs` → `users(admin_user_id)` (keep log, nullify admin ID)
- `mcp_tool_invocations` → `users(actor_user_id)` (keep invocation, nullify actor)

### Billing Integration (User-Only)

Better Auth users integrate with Polar.sh for subscription management:

**Tables**:
- `polar_customers`: Links user_id → polar_customer_id, tracks subscription tier
- Subscription tiers: `free` (default), `pro`, `enterprise`

**API Routes**:
- `POST /billing/checkout`: Create Polar checkout session
- `POST /billing/webhook`: Process Polar webhook events
- `GET /billing/subscription`: Get current subscription details
- `POST /billing/verify-receipt` (mobile): Verify iOS/Android receipt

**Webhook Events**:
- `subscription.created`: Upgrade tier to `pro`/`enterprise`
- `subscription.canceled`: Downgrade tier to `free`
- `subscription.updated`: Sync tier changes

**Mobile Flow**:
1. User initiates purchase via App Store/Play Store
2. App submits receipt to `/billing/verify-receipt`
3. Backend validates receipt with Apple/Google
4. Backend creates/updates `polar_customers` record
5. Subscription tier updated

**Admin Context**: Admins do NOT have billing records. The `polar_customers` table and `/billing/*` routes are user-only.

## Performance Benchmarking

### Admin Query Performance (SC-007)

Script: `../../scripts/db/adminQueryBenchmark.ts`

Measures latency impact of RLS policies on admin queries:

```bash
cd apps/api
DATABASE_URL=<neon-url> pnpm exec ts-node ../../scripts/db/adminQueryBenchmark.ts
```

**Benchmarks**:
1. SELECT users (admin context, RLS enabled) - 100 iterations
2. SELECT polar_customers (admin override) - 100 iterations
3. SELECT admin_audit_logs (admin-only table) - 100 iterations
4. JOIN users + polar_customers - 100 iterations
5. COUNT(*) FROM users - 100 iterations
6. Raw SQL SELECT (baseline) - 100 iterations

**Thresholds**:
- ✅ PASS: p95 latency <100ms
- ⚠️  WARN: p95 latency 100-200ms
- ❌ FAIL: p95 latency >200ms

**Output Example**:
```
📊 Benchmark Results:
┌─────────┬───────────────────────────────────────┬────────────┬──────────┬────────┬────────┬────────┐
│ (index) │              operation                │ iterations │ avgLatencyMs │ minMs │ maxMs │ p95Ms │
├─────────┼───────────────────────────────────────┼────────────┼──────────┼────────┼────────┼────────┤
│    0    │ 'SELECT users (admin, RLS enabled)'   │    100     │   45.23  │  32.1  │  89.5  │  62.3  │
│    1    │ 'SELECT polar_customers (admin)'      │    100     │   38.67  │  28.4  │  71.2  │  55.8  │
│    2    │ 'SELECT admin_audit_logs (admin)'     │    100     │   41.89  │  30.2  │  78.6  │  59.1  │
│    3    │ 'JOIN users + polar_customers (admin)'│    100     │   67.34  │  48.7  │ 112.3  │  91.2  │
│    4    │ 'COUNT(*) FROM users (admin)'         │    100     │   35.12  │  25.9  │  68.4  │  51.7  │
│    5    │ 'SELECT ... LIMIT 50 (raw SQL)'       │    100     │   33.45  │  24.1  │  65.8  │  49.3  │
└─────────┴───────────────────────────────────────┴────────────┴──────────┴────────┴────────┴────────┘

🔍 Analysis:
Average Latency (all operations): 43.62ms
Worst p95 Latency: 91.2ms
✅ PASS: All admin queries complete within acceptable latency (<100ms p95)
```

## Testing

### Test Infrastructure

**Vitest Configuration** (`vitest.config.ts`):
- Path aliases for packages: `@cloudmake/*`, `@flaresmith/*`
- Regex-based aliases for relative db imports: `../../db/schema`, `../../db/client`
- Setup file: `tests/setup.ts` (initializes TEST_DATABASE_URL)

**Running Tests**:

```bash
# All tests
pnpm test

# Specific test file
pnpm test tests/security/crossBoundary.test.ts

# Coverage
pnpm test --coverage
```

### Database-Dependent Tests

Some tests require a real Neon Postgres connection:

```bash
export TEST_DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
pnpm test
```

**Skipped Tests** (until TEST_DATABASE_URL configured):
- `tests/billing/webhookSubscription.test.ts`: Polar webhook processing
- `tests/user/adminForbidden.test.ts`: Admin boundary enforcement
- `tests/security/crossBoundary.test.ts`: Cross-boundary access control (SC-003, SC-005, SC-010)
- `tests/security/adminAuditLogsBlocked.test.ts`: RLS blocking for admin_audit_logs (SC-003)

### Cross-Boundary Tests (SC-003, SC-005, SC-010)

File: `tests/security/crossBoundary.test.ts`

Validates:
- User token → `/admin/users` = 403 Forbidden within 50ms (SC-005)
- Admin token → `/admin/users` = 200 OK
- User data scope isolation (users see only own `polar_customers`)
- Admin override (admins see all `polar_customers`)
- Token type mismatch rejected in <10ms (SC-010)
- Clear error messages with hint and context

### Admin Audit Logs Blocking (SC-003)

File: `tests/security/adminAuditLogsBlocked.test.ts`

Validates:
- Standard user SELECT admin_audit_logs = 0 rows (RLS blocks)
- Standard user INSERT/UPDATE/DELETE admin_audit_logs = rejected
- Admin SELECT admin_audit_logs = full visibility
- Admin INSERT/UPDATE/DELETE admin_audit_logs = allowed
- JOIN queries maintain isolation (users see user records but no audit data)

## Development

### Local Setup

```bash
# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env
# Edit .env with real credentials

# Run migrations
pnpm db:migrate

# Start dev server
pnpm dev

# API available at http://localhost:8787
```

### Database Migrations

```bash
# Generate new migration
pnpm db:generate

# Run migrations
pnpm db:migrate

# Rollback last migration
pnpm db:rollback
```

**Migration Files** (`db/migrations/`):
- `00_init.sql`: Tables + constraints
- `01_rls_enable.sql`: Enable RLS on tables
- `005-003-rls-policies.sql`: RLS policies for dual auth
- `04_fk_constraints.sql`: Foreign key constraints with cascade behavior

### Adding New Routes

1. **Define Zod schema** in `packages/types/src/api/<domain>.ts`
2. **Create service** in `src/services/<domain>Service.ts`
3. **Create route handler** in `src/routes/<domain>/<action>.ts`
4. **Register route** in `src/app.ts`
5. **Add middleware** (adminBoundary, auditLog, etc.) as needed
6. **Write tests** in `tests/<domain>/<action>.test.ts`

**Admin-Only Route Example**:

```typescript
// src/routes/admin/users.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { adminBoundary } from '../../middleware/adminBoundary';
import { auditLog } from '../../middleware/auditLog';
import { getUsersSchema } from '@cloudmake/types';

const app = new Hono();

app.get(
  '/admin/users',
  adminBoundary,
  auditLog,
  zValidator('query', getUsersSchema),
  async (c) => {
    const { limit = 50, offset = 0 } = c.req.valid('query');
    const users = await db.select().from(users).limit(limit).offset(offset);
    return c.json({ users });
  }
);

export default app;
```

## Deployment

### Cloudflare Workers

**Configuration**: `wrangler.toml`

```bash
# Deploy to preview
pnpm run deploy:preview

# Deploy to production
pnpm run deploy:prod
```

### Environment Variables (Cloudflare Secrets)

```bash
# Set secrets via Cloudflare CLI
wrangler secret put DATABASE_URL
wrangler secret put NEON_AUTH_PROJECT_ID
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put POLAR_WEBHOOK_SECRET
wrangler secret put JWT_SECRET
```

### Required Secrets

| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `NEON_AUTH_PROJECT_ID` | Neon Auth project identifier |
| `BETTER_AUTH_SECRET` | Better Auth signing key |
| `POLAR_WEBHOOK_SECRET` | Polar.sh webhook signature verification |
| `JWT_SECRET` | JWT signing key for admin/user tokens |
| `GITHUB_PAT` | GitHub Personal Access Token (repo, codespaces) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (workers, pages) |
| `POSTMAN_API_KEY` | Postman API key (collections, environments) |

## Security Considerations

### Token Type Enforcement

All JWT tokens MUST include `type: "admin" | "user"`:

```typescript
// Admin token payload
{
  sub: "admin-user-id",
  type: "admin",
  role: "admin",
  iat: 1234567890,
  exp: 1234567890
}

// User token payload
{
  sub: "user-id",
  type: "user",
  role: "user",
  tier: "pro", // subscription tier
  iat: 1234567890,
  exp: 1234567890
}
```

Middleware validates token type matches route expectations.

### Admin Boundary Enforcement

Routes under `/admin/*` MUST use `adminBoundary` middleware:

```typescript
app.use('/admin/*', adminBoundary);
```

Returns 403 Forbidden if user token attempts admin route.

### RLS Defense-in-Depth

Application layer (`RoleDataScopeService`) duplicates database RLS policies:

1. Database layer enforces via Postgres RLS
2. Application layer enforces via service methods
3. Middleware layer enforces via route guards

**Why triple-layer?**: Defense-in-depth prevents privilege escalation if any single layer is bypassed.

### Audit Logging

All admin actions logged to `admin_audit_logs`:

```sql
INSERT INTO admin_audit_logs (
  admin_user_id, action_type, entity_type, entity_id, 
  changes_json, ip_address, created_at
) VALUES (...);
```

Audit logs:
- Immutable (no UPDATE or DELETE after creation)
- SET NULL on admin deletion (preserve logs, nullify actor)
- Admin-only visibility (users cannot read)

## Success Criteria

### SC-003: Data Isolation
✅ Standard users cannot SELECT/INSERT/UPDATE/DELETE `admin_audit_logs` or `admin_sessions`
✅ Users see only own records in `user_sessions`, `polar_customers`, `mapbox_tokens`, `notification_preferences`
✅ Admins see all records across all tables

### SC-005: Latency Targets
✅ Admin boundary rejection <50ms (token type mismatch)
✅ RLS-filtered queries <100ms p95 latency

### SC-007: Connection Pool Efficiency
✅ System supports 10,000 concurrent standard user sessions
✅ System supports 100 concurrent admin sessions
✅ Admin pool never exhausted by user query storms

### SC-010: Token Type Mismatch
✅ User token → admin route = 403 within 10ms
✅ Admin token → user route = allowed (admins can access user features)

### SC-020: Admin Forbidden Enforcement
✅ User token → `/admin/*` routes = 403 Forbidden
✅ Admin token → `/admin/*` routes = 200 OK
✅ User token → `/billing/*` routes = 200 OK (user-only features)

## Troubleshooting

### "Connection pool exhausted" Error

Check pool utilization:

```typescript
import { getConnectionPoolHealth } from './db/poolConfig';

const health = getConnectionPoolHealth();
console.log(health);
// {
//   healthy: false,
//   stats: { admin: { utilization: 95 }, user: { utilization: 98 } },
//   warnings: ['Admin pool >80% utilization', 'User pool >90% utilization']
// }
```

**Solutions**:
- Increase pool size in `poolConfig.ts` (admin: 100→200, user: 1000→2000)
- Optimize queries (add indexes, reduce JOIN complexity)
- Enable query timeout enforcement (already set: admin 60s, user 30s)
- Scale Neon compute tier (more connections supported)

### "RLS policy violation" Error

User attempted to access admin-only table or another user's records.

**Debug**:
1. Check token payload: `type` should match route expectations
2. Verify middleware order: `roleGuard` must run before `adminBoundary`
3. Confirm RLS policies applied: `SELECT * FROM pg_policies WHERE tablename = 'admin_audit_logs';`

### "Admin boundary forbidden" Error

User token attempted to access `/admin/*` route.

**Expected behavior**: This is working as designed. Users should not access admin routes.

**Solution**: Use admin token or redirect user to appropriate user-facing route.

### Tests Skipped (TEST_DATABASE_URL not set)

Set environment variable:

```bash
export TEST_DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
pnpm test
```

For Neon Postgres, obtain connection string from Neon console.

## References

- [Spec: Dual Auth Architecture](../../specs/005-dual-auth-architecture/spec.md)
- [Plan: Implementation Plan](../../specs/005-dual-auth-architecture/plan.md)
- [Tasks: Task Breakdown](../../specs/005-dual-auth-architecture/tasks.md)
- [Data Model: Entity Relationships](../../specs/005-dual-auth-architecture/data-model.md)
- [Contracts: OpenAPI Specification](../../specs/005-dual-auth-architecture/contracts/openapi.yaml)
- [Neon Auth Docs](https://neon.tech/docs/guides/auth-neon)
- [Better Auth Docs](https://better-auth.com/docs)
- [Polar.sh API Docs](https://docs.polar.sh/api)
- [Hono Docs](https://hono.dev/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
