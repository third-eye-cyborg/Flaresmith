# Data Model (Phase 1)

Derived from spec FR-001–FR-078, SC-001–SC-032, plus research decisions.

## Overview
Core domains: Authentication (admin/user sessions), Billing (Polar), Notifications (segments & preferences), MCP Observability (tool invocations, drift snapshots, server metrics), Mapbox Tokens, Rate Limiting (KV-backed ephemeral), Media (Stream playback tokens), Audit (admin actions).

## Entities

### User
```
users (
  id UUID PK,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin','user')) NOT NULL,
  neon_auth_id TEXT NULL,
  better_auth_id TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)
```
RLS:
- `role='user'`: `USING (id = auth.uid())`.
- `role='admin'`: `USING (true)`.

### AdminSession
```
admin_sessions (
  id UUID PK,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET NULL,
  user_agent TEXT NULL
)
```
RLS: only admins: `USING (EXISTS (SELECT 1 FROM users u WHERE u.id = admin_sessions.user_id AND u.role='admin'))`.
Indexes: (user_id, expires_at).

### UserSession
```
user_sessions (
  id UUID PK,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET NULL,
  user_agent TEXT NULL,
  polar_customer_id TEXT NOT NULL,
  subscription_tier TEXT CHECK (subscription_tier IN ('free','pro','enterprise')) NOT NULL,
  subscription_status TEXT CHECK (subscription_status IN ('active','canceled','past_due','trialing')) NOT NULL
)
```
RLS: owner only `USING (user_id = auth.uid())` OR admin override.
Index: (user_id, subscription_status).

### PolarCustomer
```
polar_customers (
  id UUID PK,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  polar_customer_id TEXT UNIQUE NOT NULL,
  subscription_tier TEXT NOT NULL,
  subscription_status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)
```
RLS: owner or admin.
Index: (polar_customer_id).

### AdminAuditLog
```
admin_audit_logs (
  id UUID PK,
  admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NULL,
  changes_json JSONB NULL,
  ip_address INET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)
```
RLS: admins only.
Partitioning (optional future) by month.

### Project
```
projects (
  id UUID PK,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)
```
RLS: admin sees all; user sees own or shared (share table not yet defined).

### MapboxToken
```
mapbox_tokens (
  id UUID PK,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  prefix TEXT NOT NULL, -- first 6 chars
  suffix TEXT NOT NULL, -- last 4 chars
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
)
```
RLS: owner or admin.
Unique constraint: (user_id, token_hash).

### NotificationSegment
```
notification_segments (
  id UUID PK,
  name TEXT UNIQUE NOT NULL,
  description TEXT NULL,
  criterion_json JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)
```
RLS: admins only.

### NotificationPreference
```
notification_preferences (
  id UUID PK,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  segments_subscribed UUID[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
)
```
RLS: owner or admin read.

### MCPToolInvocation
```
mcp_tool_invocations (
  id UUID PK,
  tool_name TEXT NOT NULL,
  server_name TEXT NOT NULL,
  actor_type TEXT CHECK (actor_type IN ('admin','user','system')) NOT NULL,
  actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  duration_ms INT NOT NULL,
  success BOOLEAN NOT NULL,
  error_code TEXT NULL,
  correlation_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  resource_ref TEXT NULL,
  rate_limit_applied BOOLEAN DEFAULT false
)
```
Index: (server_name, timestamp), (actor_id, timestamp), (tool_name, timestamp DESC).
Retention strategy: 30 days hot.

### MCPServerMetric
```
mcp_server_metrics (
  id UUID PK,
  server_name TEXT NOT NULL,
  date DATE NOT NULL,
  p95_latency_ms INT NOT NULL,
  error_rate_pct NUMERIC(5,2) NOT NULL,
  seq_latency_ms INT NULL,
  parallel_latency_ms INT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)
```
Unique: (server_name, date).

### DriftSnapshot
```
mcp_drift_snapshots (
  id UUID PK,
  server_name TEXT NOT NULL,
  diff_json JSONB NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL,
  status TEXT CHECK (status IN ('detected','resolved')) NOT NULL DEFAULT 'detected'
)
```
RLS: admins only.

### StreamPlaybackDeny
```
stream_playback_deny (
  id UUID PK,
  token_id TEXT NOT NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)
```
Used for denylist before signature verify.

### RateLimitEvent (Optional Neon archival)
```
rate_limit_events (
  id UUID PK,
  server_name TEXT NOT NULL,
  actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL,
  quota_remaining INT NOT NULL,
  retry_after_seconds INT NULL,
  timestamp TIMESTAMPTZ DEFAULT now()
)
```
Used to audit SC-030 compliance; not required for enforcement.

## Relationships Summary
- User 1—* AdminSession/UserSession/PolarCustomer/MapboxToken/NotificationPreference/MCPToolInvocation.
- AdminAuditLog references User (admin) optionally.
- NotificationPreference segments_subscribed references NotificationSegment IDs (no FK for flexibility; validate on write).

## State Transitions
### Subscription Status
`trialing -> active -> (past_due|canceled)`
- Webhook updates orchestrate transitions; RLS ensures user sees own. Admin can view all.

### Drift Snapshot Lifecycle
`detected -> resolved` with resolution marking diff applied; automatic nightly detection inserts detected snapshots; resolution triggered by sync command.

### Stream Token Validity
Implicit TTL (5m). Revocation path: insertion into `stream_playback_deny` triggers immediate invalidation.

## Idempotency Keys (Examples)
- Receipt validation: `receipt:<SHA256(receipt_token)>`
- Drift sync: `drift-sync:<server_name>:<date>`
- Notification dispatch: `notify:<segmentId>:<timestamp_rounded_min>`

## RLS Summary Table
| Table | User Access | Admin Access |
|-------|-------------|--------------|
| users | self only | all |
| admin_sessions | none | all (own + other for monitoring) |
| user_sessions | self | all |
| polar_customers | self | all |
| admin_audit_logs | none | all |
| mapbox_tokens | self | all |
| notification_segments | none | all |
| notification_preferences | self | all |
| mcp_tool_invocations | self (rows where actor_id=self) | all |
| mcp_server_metrics | read (aggregate view only? future) | all |
| mcp_drift_snapshots | none | all |
| stream_playback_deny | none | all |
| rate_limit_events | none | all |

## Open Questions (None)
All clarifications resolved in research.md.

## Next Steps
Generate OpenAPI & MCP tool contracts referencing these entities; ensure Zod schema parity in `packages/types`.
