# Research: Dual Authentication & Multi-MCP Ecosystem (Phase 0)

## Overview
This document resolves all NEEDS CLARIFICATION items from `plan.md` Technical Context. Each section includes Decision, Rationale, Alternatives Considered, and Implementation Notes.

---
## 1. Cloudflare D1 Usage vs Neon Postgres
**Decision**: Do NOT adopt D1 for primary transactional data in this feature phase; continue using Neon Postgres for all auth, billing, and audit entities. Use D1 only (deferred) for ultra‑low latency ephemeral feature flag sampling if PostHog latency degrades (not in current scope).
**Rationale**: Neon provides branching, RLS, and robust SQL needed for complex audit + subscription joins; D1 maturity and global consistency limitations introduce risk for auth flows. Avoid duplicate write paths.
**Alternatives**: (a) Hybrid: Auth read cache in D1 (complexity + eventual consistency issues). (b) Full migration to D1 (loses advanced Postgres features). Rejected.
**Implementation Notes**: All data model definitions remain Drizzle + Neon. D1 placeholder removed from storage section; future adoption requires spec amendment.

---
## 2. Cloudflare KV Scope & TTL Strategy
**Decision**: Use KV for: (a) MCP drift last-check snapshot (reduces Neon reads), (b) Cached Mapbox style list (TTL 10m), (c) Rate limit counters (supplemented by Neon fallback). Exclude session tokens (remain in Neon + Secure Store for mobile).
**Rationale**: KV offers edge-close high speed for lightweight metadata; drift + styles tolerant to short staleness; counters benefit from edge replication.
**Alternatives**: Store all in Neon (increased latency for global reads), use Durable Objects (overkill for simple caching). Rejected.
**Implementation Notes**: Namespacing keys: `drift:lastCheck`, `mapbox:styles:<env>`, `ratelimit:<server>:<window>:<id>`. Provide purge function in maintenance script.

---
## 3. Mapbox Token Hashing & Display
**Decision**: Store tokens salted + peppered: `hash = SHA256(salt + token + PEPPER_ENV)`. Display only first 6 and last 4 chars with middle replaced by `…` (e.g., `pk.abc123…zz9K`).
**Rationale**: Salt defends against rainbow tables; environment pepper allows rotation; partial display aids user recognition while protecting secret.
**Alternatives**: Plain hash (no pepper rotation), encryption (adds KMS complexity). Rejected.
**Implementation Notes**: Table `mapbox_tokens`: `id, user_id, token_hash, prefix, suffix, scopes[], created_at`. Validation ensures prefix matches provided token.*

---
## 4. Cloudflare Stream Playback Token TTL & Revocation
**Decision**: Issue playback tokens (JWT HS256) with 5m TTL; revoke by rotating signing key daily + maintaining denylist for explicit invalidations (rare) in KV (`stream:deny:<tokenId>`).
**Rationale**: Short TTL limits abuse window; key rotation invalidates old tokens; denylist handles moderation removals without waiting TTL.
**Alternatives**: Long-lived tokens + manual revoke (slower reaction), per-request signed URLs (higher latency). Rejected.
**Implementation Notes**: Signing secret in Cloudflare secret store; audit log entry for revocations; enforcement checks denylist before signature verify.

---
## 5. Rate Limiting Algorithm Specifics
**Decision**: Token bucket per server + per actor (user/admin/system). Config: `capacity=120`, `refillRate=60 tokens/min` (1 token each second), burst allowed up to remaining capacity. Retry guidance: `Retry-After = remainingFillSeconds`.
**Rationale**: Matches FR-074 quotas directly; simple predictable implementation; avoids leaky bucket complexity. Burst absorbs short spikes.
**Alternatives**: Fixed window (boundary artifacts), sliding window (higher compute), leaky bucket (less intuitive). Rejected.
**Implementation Notes**: KV primary counter store + Neon fallback on KV failure. Key: `ratelimit:<server>:<actorId>`. Use Lua script equivalent in Workers to ensure atomic increment + check.

---
## 6. Automated MCP Load Test Methodology
**Decision**: Nightly scheduled Workers CRON triggers load test for each server (Polar, Better Auth, Neon, Cloudflare, GitHub, Postman, Mapbox, OneSignal, PostHog). Sequence: 10 representative tool calls sequential + 10 parallel (Promise.all) measuring p95 + error %. Results persisted to `mcp_server_metrics` table.
**Rationale**: Captures both isolated and concurrent performance; nightly cadence balances cost and freshness.
**Alternatives**: Continuous sampling (costly), weekly only (slow detection). Rejected.
**Implementation Notes**: Tools selected: list ops + one mutation (restricted to dev). Production restricts to read-only subset; mutation tests skipped.

---
## 7. OneSignal Segmentation Schema & RLS
**Decision**: Table `notification_segments`: `id, name, description, criterion_json (JSONB), created_by (admin user), created_at`. RLS: admins see all; users see none (segments managed by admin only). User preferences stored in `notification_preferences`: `id, user_id, segments_subscribed[]` with RLS user-only + admin read.
**Rationale**: Separation of segment definition (admin-only) from subscription (user-managed) ensures least privilege.
**Alternatives**: Single table with mixed access (complex RLS), external segment storage only in OneSignal (loss of audit). Rejected.
**Implementation Notes**: MCP admin tools: `list_segments`, `create_segment`, `dispatch_notification(segmentId|userIds)`. User context tool: `get_subscription_preferences` only.

---
## 8. Expo-Polar Receipt Validation Flow
**Decision**: Mobile client completes native purchase → sends receipt token to backend Hono route → backend validates with Polar API → updates subscription status, emits audit event. No direct client trust of receipt.
**Rationale**: Prevents tampering; server authoritative subscription state; audit continuity.
**Alternatives**: Client-side validation then session patch (vulnerable). Rejected.
**Implementation Notes**: Endpoint `/billing/mobile/receipt` (POST) returns updated tier/status. Retries with idempotency key `receipt:<hash>`.

---
## 9. MCP Audit Log Schema Normalization
**Decision**: Table `mcp_tool_invocations`: `id, tool_name, server_name, actor_type (admin|user|system), actor_id (nullable for system), duration_ms, success, error_code (nullable), correlation_id, timestamp, resource_ref (nullable), rate_limit_applied (boolean)`.
**Rationale**: Captures SC-019 coverage, supports filtering by error_code, actor, latency analysis; includes rate_limit_applied for SC-030 audits.
**Alternatives**: Merge into admin audit log (mixes semantics), omit resource_ref (reduces traceability). Rejected.
**Implementation Notes**: Indexes: `(server_name, timestamp)`, `(actor_id, timestamp)`. Retention: 30 days hot, archive to cold storage (future spec).

---
## Consolidated Decisions Summary
| Topic | Decision | Key Impact |
|-------|----------|-----------|
| D1 | Defer; Neon only | Simplifies transactional consistency |
| KV | Drift, styles, rate limit counters | Edge performance + low complexity |
| Mapbox Tokens | Salt+pepper SHA256, partial display | Secure storage + UX recognition |
| Stream Tokens | 5m TTL + key rotation + denylist | Controlled playback security |
| Rate Limiting | Token bucket 60/min, burst 120 | Predictable quotas |
| MCP Load Tests | Nightly seq+parallel sampling | Timely performance insight |
| OneSignal Schema | Separate segments & preferences | Clean RLS boundaries |
| Expo-Polar Validation | Server-side authoritative | Prevents fraud |
| MCP Audit Schema | Dedicated table with latency & rate flag | Complete observability |

All NEEDS CLARIFICATION items resolved. No outstanding unknowns.

## Amendments to Plan
Update Technical Context to remove D1 ambiguity; specify KV usage; finalize rate limiting algorithm; detail audit log schema & load test approach.

## Next Phase Readiness
Gate re-check prerequisites satisfied; proceed to Phase 1 (data-model.md, contracts, quickstart, MCP descriptor expansions).
