# Flaresmith

**Spec-first orchestration platform for multi-environment development workflows**

Flaresmith provisions and synchronizes GitHub repos, Cloudflare Workers/Pages, Neon Postgres branches, and Postman collections—all driven by declarative specifications.

## Features

- 🚀 **Project Provisioning**: Create fully-configured projects with GitHub repos, Codespaces, database branches, and deployment pipelines
- 📊 **Environment Dashboard**: Monitor dev/staging/prod environments across all integrations in one view
- 🔄 **Spec-Driven Sync**: Automatically generate Zod schemas, Drizzle models, API routes, and Postman collections from spec files
- 💬 **AI Chat + Editor**: In-browser code editor with AI assistant that proposes spec-aware edits and commits to feature branches

## Quick Start

### Prerequisites

- Node.js 20.x or later
- pnpm 9.x or later
- GitHub account with repo/workflow/codespace/environment permissions
- Cloudflare account (Workers/Pages)
- Neon Postgres account
- Postman account

### Installation

```bash
git clone https://github.com/yourusername/cloudmake.git
# Clone the repository
git clone https://github.com/yourusername/flaresmith.git
cd flaresmith

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials. NEVER commit real secrets. See SECURITY.md.

# Start development servers
pnpm dev
```

### Dual Auth Quickstart (Admin + User Surfaces)

After installing dependencies you can immediately scaffold and sync the dual authentication architecture.

1. Provision a project (includes optional dual-auth scaffold by default):
	```bash
	pnpm exec ts-node scripts/provision/createProject.ts --name "demo" --org default
	```
	This will (if not already present) create `apps/admin-web`, `apps/user-web`, `apps/admin-mobile`, `apps/user-mobile` and inject template examples under `templates/`.

2. Run all surfaces together:
	```bash
	pnpm dev:all
	```

3. Set per‑surface environment flags (admin vs user) – copy `.env.example` to `.env.admin` / `.env.user` or use provided samples:
	```env
	# .env.admin
	APP_TYPE=admin
	NEXT_PUBLIC_APP_TYPE=admin
	EXPO_PUBLIC_APP_TYPE=admin

	# .env.user
	APP_TYPE=user
	NEXT_PUBLIC_APP_TYPE=user
	EXPO_PUBLIC_APP_TYPE=user
	```

4. Sync template artifacts idempotently if you add the feature later:
	```bash
	pnpm exec ts-node scripts/spec/syncAuth.ts
	```

5. Confirm isolation:
	- Admin web/mobile should NOT show billing UI.
	- User web/mobile should render subscription dashboard & (later) checkout logic.
	- RLS baseline appears at `templates/apps/api/db/migrations/rls.sql` (applied during US3).

Spec trace references (FR-001, FR-002, FR-005a/b, FR-013, FR-022, FR-071, SC-003, SC-005, SC-013) are embedded in template comments to preserve spec‑first provenance.


### Development

```bash
# Run all apps in development mode
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Testing
pnpm test

# Build for production
pnpm build
```

## Project Structure

```
apps/
├── api/             # Hono backend on Cloudflare Workers + Drizzle ORM
├── admin-web/       # Next.js 14 admin portal (isolated, no billing UI)
├── user-web/        # Next.js 14 user app (billing + subscription surfaces)
├── admin-mobile/    # Expo admin mobile app (Neon Auth + MFA)
└── user-mobile/     # Expo user mobile app (Better Auth + Billing)

packages/
├── types/        # Zod schemas (single source of truth)
├── api-client/   # Typed API wrapper with Zod validation
├── ui/           # Shared React Native primitives
├── utils/        # Hooks, helpers, env management
└── config/       # ESLint, Prettier, Tailwind, tsconfig bases

specs/            # Feature specifications (spec-first workflow)
mcp/              # MCP 2.0 tool descriptors for AI agents
scripts/          # CLI utilities (provision, spec-apply, security)
```

## Architecture

Flaresmith follows a **spec-first** development model:

1. **Specifications First**: All features start in `/specs/[feature]/spec.md`
2. **Code Generation**: Zod schemas, DB models, API routes, and MCP tools are generated from specs
3. **Environment Parity**: Dev/staging/prod environments maintained consistently
4. **Idempotent Operations**: All provisioning is convergent and retryable
5. **Observability & Security**: Structured logs (requestId, traceId), rate limit & circuit breaker metrics, secret auditing & rotation (FR-031..FR-036)

### Environment Parity & Neon Branch Mapping

Canonical environments span all integrations:

| Environment | GitHub Branch | Neon Branch | Cloudflare | Postman Env |
|-------------|---------------|-------------|------------|-------------|
| dev         | feature/*     | dev         | preview    | dev         |
| staging     | staging       | staging     | staging    | staging     |
| prod        | main          | prod        | production | production  |

Neon project & branch identifiers (configure via env variables, do not hardcode):

```
NEON_PROJECT_ID=autumn-unit-81618590
NEON_BRANCH_MAIN=br-sparkling-silence-ahajm2k2
NEON_BRANCH_DEV=br-misty-base-ah2g935t
NEON_BRANCH_STAGING=br-raspy-poetry-ahesy73s
NEON_BRANCH_PROD=br-cool-feather-ahm11boj
```

These appear in `.env.example` for convenience. Use rotation-safe secrets for keys (JWT_SIGNING_KEY generated by rotation job; MASTER_ENC_KEY rotated annually).

### Provisioning Flow (User Story 1)

`POST /projects` orchestrates:
1. GitHub repo & Codespace (idempotency key `${projectId}-githubRepo-dev`)
2. Neon project/branches (keys `${projectId}-neonProject-*` / `${projectId}-neonBranch-<env>`)
3. Cloudflare Worker + Pages preview
4. Postman workspace + collections (base + env-specific)
5. Audit log entries + metrics emission (`provisioning_duration_seconds`)

Retries return existing resource IDs; collisions converge without error.

### Spec Apply (User Story 3)

`POST /specs/apply` produces deterministic artifacts:
- Zod schemas (packages/types)
- Drizzle models (apps/api/db/schema)
- Hono routes (apps/api/src/routes)
- Postman collections (postman/)
- MCP tool descriptors (mcp/servers/*)
Generates drift report with summary & conflicts array (see data-model.md). Conflicts prevent overwrite when local uncommitted changes exist.

### Chat + Editor (User Story 4)

WebSocket endpoint `/chat/stream` uses JWT query auth; context injection adds spec FR/SC IDs and recent drift summary. Optimistic locking ensures commit base SHA matches current repo head. Large files (>1MB) range-loaded (research D-003).

### Reliability & Rate Limiting

Circuit breaker: opens after ≥10 failures/60s, half-open probe after 30s; metrics `circuit_breaker_open_total`. Rate limiting: per-user 60/min (burst 120), per-project 300/min (burst 600); overhead target p95 <5ms. Headers: `X-RateLimit-Remaining-User`, `X-RateLimit-Remaining-Project`, `Retry-After` on 429.

### Security & Secrets

Secret scanning pre-commit + CI; secret audit logging (`secret_access_total`, `key_rotation_total`) with origin field (`user|system`). JWT signing key rotation 90d (7d grace). Encrypted secrets metadata using pgcrypto (AES-GCM). Logger redaction denies leaking token patterns.
**OAuth Provider Secrets** (Feature 003): Mobile authentication requires OAuth credentials for Apple (`OAUTH_APPLE_CLIENT_ID`, `OAUTH_APPLE_TEAM_ID`, `OAUTH_APPLE_KEY_ID`, `OAUTH_APPLE_PRIVATE_KEY`), Google (`OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET`), and GitHub (`OAUTH_GITHUB_CLIENT_ID`, `OAUTH_GITHUB_CLIENT_SECRET`). Add to GitHub Secrets (Actions scope) and sync to Codespaces/Dependabot via Feature 002's `/api/github/secrets/sync` endpoint. See `specs/003-neon-auth-migration/quickstart.md` for detailed setup.


### Preview Environments

Up to 15 active preview environments; TTL default 72h (configurable 24h–168h). Cap overflow returns `409 ENV_PREVIEW_LIMIT_REACHED`. Archival job purges expired previews; metrics `preview_env_active_total`.

### Observability

Structured logs + traces (5% baseline sampling; forced for errors & slow ops). Metrics catalog includes provisioning, latency histograms, retry attempts, circuit breaker, rate limit hits, health check failures. Error envelope standardized (code, message, severity, retryPolicy, requestId, traceId, timestamp, context, hint, causeChain).

### Next Steps

1. Copy `.env.example` → `.env` and fill credentials.
2. Run `pnpm dev` then provision a project via script or API.
3. Open `/projects/<id>/environments` to view environment matrix.
4. Edit spec and run spec apply script to generate artifacts.
5. Use editor/chat to propose and apply code changes.
6. Review metrics & logs for provisioning latency and rate limit overhead.

Refer to `specs/001-platform-bootstrap/spec.md` for full FR (functional requirements) and SC (success criteria) mapping.

## Multi-App Development (Dual Auth Architecture)

The repository now hosts four frontend surfaces to enforce strict admin vs user isolation while sharing a single spec-first backend:

| Surface | Directory | Auth System | Billing Context | Token Claim `type` |
|---------|-----------|-------------|-----------------|---------------------|
| Admin Web | `apps/admin-web` | Neon Auth + MFA | None | `admin` |
| User Web | `apps/user-web` | Better Auth | Polar (web checkout) | `user` |
| Admin Mobile | `apps/admin-mobile` | Neon Auth + MFA | None | `admin` |
| User Mobile | `apps/user-mobile` | Better Auth | Polar (native purchase) | `user` |

### Running Individual Surfaces

```bash
# All surfaces concurrently (admin/user web + mobile)
pnpm dev:all

# Individual targets
pnpm dev:admin-web
pnpm dev:user-web
pnpm dev:admin-mobile   # Expo Dev Tools (admin)
pnpm dev:user-mobile    # Expo Dev Tools (user)
```

`pnpm dev` (legacy) will still run all dev scripts via Turbo; prefer `pnpm dev:all` for explicit multi-app startup with filtering.

### Environment Variables

Set `APP_TYPE` to `admin` or `user` in the respective environment files (.env.admin, .env.user) so UI surfaces can conditionally render billing or audit features:

```env
APP_TYPE=admin
NEXT_PUBLIC_APP_TYPE=admin
EXPO_PUBLIC_APP_TYPE=admin
```

Admin surfaces must omit billing navigation entirely (enforced in their layouts). User surfaces include a Billing entry linking to subscription management and Polar checkout (see FR-005a/FR-049).

### Billing Isolation

Admin apps never load Polar keys or subscription state. User apps read billing flags (`USER_BILLING_ENABLED=true`) to conditionally enable checkout & receipt flows. This prevents privilege escalation and aligns with SC-003 (cross-role isolation).

### Upcoming Work

Subsequent phases will add:
- Token type enforcement middleware (`apps/api/src/middleware/tokenType.ts`)
- Session issuance & MFA routes (US1)
- Subscription & webhook handlers (US2)
- RLS migrations (US3) and mobile secure store wrappers (US4)
- Template propagation scripts (US5)

Track progress in `specs/005-dual-auth-architecture/tasks.md`.

## Multi-MCP Ecosystem & Performance Targets

Flaresmith integrates **10+ MCP (Model Context Protocol) servers** to orchestrate external services with strict isolation rules and performance guarantees:

### Integrated MCP Servers

| Server | Purpose | Admin Access | User Access | Performance Target (p95) |
|--------|---------|--------------|-------------|--------------------------|
| **GitHub** | Repository & secrets management | ✓ Full | ✗ Read-only | ≤500ms |
| **Cloudflare** | Workers/Pages deployment | ✓ Full | ✗ None | ≤400ms |
| **Neon** | Database branching & migrations | ✓ Full | ✗ None | ≤300ms |
| **Postman** | Collection sync & test automation | ✓ Full | ✗ None | ≤600ms |
| **Polar** | Subscription billing (web/mobile) | ✗ None | ✓ Full | ≤800ms |
| **Better Auth** | User authentication & OAuth | ✗ None | ✓ Full | ≤200ms |
| **Mapbox** | Geocoding & token validation | ✓ Admin | ✓ User | ≤350ms |
| **OneSignal** | Push notifications & segments | ✓ Admin | ✓ User | ≤450ms |
| **PostHog** | Analytics & feature flags | ✓ Admin | ✓ User | ≤300ms |
| **Design System** | Token retrieval & audits | ✓ Admin | ✓ User | ≤100ms |

### Isolation Rules

**Token Type Enforcement**: All API requests include a JWT claim `type: "admin" | "user"`. Middleware (`apps/api/src/middleware/tokenType.ts`) blocks cross-boundary access:
- Admin tokens **cannot** invoke Polar, Better Auth user flows
- User tokens **cannot** invoke GitHub, Cloudflare, Neon, Postman operations

**RLS (Row-Level Security)**: Database queries enforce role-based access via Postgres RLS policies:
- Admins query `admin_audit_logs`, `admin_sessions`, all user records
- Users query only their own `user_sessions`, `polar_customers`, `notification_preferences`

**Connection Pooling**: Segmented pools reserve connections for admin vs user workloads to prevent user load from starving admin operations (see `apps/api/src/db/poolConfig.ts`).

### Performance Monitoring

**Nightly Load Tests**: `scripts/mcp/loadTestServers.ts` runs against all MCP servers and inserts p95 latency + error rate into `mcp_server_metrics` table. Thresholds defined in `scripts/mcp/loadTestThresholds.json` (T117).

**Metrics Exporter**: `GET /api/mcp/metrics` exposes Prometheus + JSON formats for observability pipelines. Alerts trigger when p95 latency exceeds 1.5x baseline or error rate >10% (SC-021).

**Graceful Degradation**: Circuit breaker pattern detects persistent MCP outages (≥90s OPEN state). When degraded, `GET /api/mcp/degradation/:serverName/fallback` returns direct API endpoints + credential requirements for manual bypass (T113).

**Rate Limiting**: Token bucket per-user (60/min) and per-project (300/min) with endpoint weights:
- Provisioning: 5 tokens
- Chat: 3 tokens
- Reads: 1 token
- Check status: `GET /api/rate-limit/status` (T112)

### Observability

- **Structured Logs**: Pino format with `requestId`, `correlationId`, secret redaction
- **Audit Trail**: All admin actions logged to `admin_audit_logs` with actor + operation metadata
- **Drift Detection**: Hourly spec drift checks ensure codebase aligns with declared spec entities (`scripts/spec/driftDetector.ts`)
- **Scheduled Tasks**: Documented in `docs/CRON_TASKS.md` (key rotation, secret scanning, preview archival)

### Security Hardening

- **Secret Scanning**: Pre-commit + CI validation blocks 15+ secret patterns (AWS, GitHub, Mapbox, Polar, PostHog, OneSignal, etc.) via `scripts/security/scanSecrets.ts` (T118)
- **Key Rotation**: JWT signing keys rotate every 90 days; master encryption keys annually with 7-day grace period
- **Redaction Middleware**: All logs scrubbed for sensitive patterns before emission

### Success Criteria Summary

| Metric | Target | Measurement |
|--------|--------|-------------|
| MCP list operations (SC-021) | p95 ≤500ms | Nightly load tests |
| Design token retrieval (SC-007) | p95 ≤100ms | GET /api/design/tokens |
| Admin queries under RLS (SC-004) | p95 ≤150ms | `scripts/db/adminQueryBenchmark.ts` |
| Accessibility (SC-003) | ≥98% AA pairs | Design system audits |
| Secrets validation (SC-005) | Clean CI run | GitHub secrets sync + validation |
| Drift blocking (SC-008) | 100% spec alignment | Hourly drift detector |

See `specs/005-dual-auth-architecture/spec.md` for full FR/SC mapping and `specs/001-platform-bootstrap/spec.md` for design system + orchestration criteria.

For a visual overview of the dual auth architecture and MCP ecosystem, see [`docs/diagrams/dual-auth-mcp.md`](./docs/diagrams/dual-auth-mcp.md).

## Documentation

- [Contributing Guide](./CONTRIBUTING.md)
- [Security Policy](./SECURITY.md)
- [Architecture Decision Records](./specs/)

## License

MIT © Flaresmith
