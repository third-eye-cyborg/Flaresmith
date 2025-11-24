# Implementation Plan: Dual Authentication Architecture & Multi-MCP Ecosystem

**Branch**: `005-dual-auth-architecture` | **Date**: 2025-11-23 | **Spec**: `specs/005-dual-auth-architecture/spec.md`
**Input**: Feature specification from `/specs/005-dual-auth-architecture/spec.md` (78 FR, 32 SC)

## Summary
Unified dual authentication system: Neon Auth for isolated admin surfaces (web + Expo) and Better Auth for standard user surfaces (web + Expo) with Polar billing (web Hono lib + Expo native purchase flow). Shared Neon Postgres with strict RLS/RBAC; environment‑aware MCP integration spanning Polar, Better Auth, Neon, Cloudflare, GitHub, Postman, Mapbox, OneSignal, PostHog, and framework guidance servers. Production/staging enforce read‑only MCP subsets; development full toolset. Success criteria emphasize isolation (no cross‑token misuse), billing performance, audit coverage, multi‑MCP reliability, rate limiting, and graceful degradation.

## Technical Context
**Language/Version**: TypeScript (Node 20.x runtime), Next.js 14 (App Router), Expo SDK 51+, Hono (Cloudflare Workers), Drizzle ORM, NEEDS CLARIFICATION: Cloudflare D1 usage scope.
**Primary Dependencies**: Next.js, Expo Router, NativeWind, Hono, Drizzle, Neon HTTP driver, Better Auth, Neon Auth, Polar SDK (web Hono integration + mobile purchase bridge), PostHog JS/Node, Mapbox GL & Geocoding, OneSignal REST/SDK, Cloudflare Images/Stream APIs, Zod for schemas, MCP 2.0 JSON descriptors.
**Storage**: Neon Postgres (primary), Cloudflare KV (ephemeral caches NEEDS CLARIFICATION), Potential D1 (transactional edge? NEEDS CLARIFICATION), Cloudflare Images/Stream (media), Secure Store (Expo tokens), Mapbox tokens hashed in Postgres (hash strategy NEEDS CLARIFICATION).
**Testing**: Vitest (unit/integration), Playwright (web E2E for auth/billing flows), Postman collections (contract tests), Expo device/simulator tests (manual + future automation), NEEDS CLARIFICATION: automated load test strategy for MCP rate limiting.
**Target Platform**: Cloudflare Workers (API), Cloudflare Pages (Next.js web), iOS/Android (Expo), Edge CDN for assets.
**Project Type**: Monorepo (multi-app: admin-web, user-web, admin-mobile, user-mobile, shared packages).
**Performance Goals**: API p95 <300ms (Constitution), Billing web checkout <500ms (SC-013), Mapbox marketing LCP <1.5s (SC-024), Stream playback start <2s p95 (SC-025), Images transform <700ms p95 (SC-026), MCP list operations <1000ms p95 (SC-021), Mobile payment sheet display <1s (SC-014).
**Constraints**: Environment parity (dev/staging/prod), read‑only MCP in staging/prod (Neon writes blocked, Cloudflare destructive ops blocked), token type mismatch rejection <10ms, zero secret leakage (redaction), nightly drift detection, rate limit 60/min/server + burst 120 (FR-074) algorithm details NEEDS CLARIFICATION.
**Scale/Scope**: ≥10k concurrent user sessions + 100 admin (SC-007), 8+ MCP servers, 78 FR, 32 SC, multi‑surface (4 apps) with shared packages.

NEEDS CLARIFICATION Items:
1. Cloudflare D1 usage justification vs Neon (when to adopt edge transactional store).
2. Cloudflare KV scope (which caches, TTL policy, invalidation strategy).
3. Mapbox token hashing approach (salted? pepper? partial display format).
4. Stream playback token TTL and revocation strategy.
5. Rate limiting internal algorithm specifics (token bucket parameters, jitter/backoff).
6. Automated MCP load test methodology (tools & schedule).
7. OneSignal segmentation data schema & RLS (fields for segments; storage location).
8. Expo-Polar receipt validation best practice (server vs client flow, security).
9. MCP audit log schema normalization (fields beyond current spec—latency percentiles?).

## Constitution Check (Gate 1)
1. Spec-First: `specs/005-dual-auth-architecture/spec.md` present with user stories, FR (001–078), SC (001–032). Checklist directory exists.
2. Environment Parity & Idempotency: Resources per env—GitHub branches (feature/*, staging, main), Neon DB branches (dev, staging, prod), Cloudflare Workers (preview, staging, prod), Pages deployments, Postman environments, MCP config segmentation. Idempotency via deterministic keys `${projectId}-${resource}-${environment}`; CRUD endpoints converge.
3. Tool-/MCP Workflow: Servers required—polar, better-auth, neon, cloudflare, github, postman, mapbox, onesignal, posthog, framework-rules. Tools: billing list/checkout, auth state query, db branch list/diff (read-only in staging/prod), deploy status, image transform (read-only in prod), stream playback token retrieval, notification broadcast (admin only), analytics feature flags & aggregates, repo/issue operations (writes dev only), collection sync/contract run (dev/staging), map style list/geocode, rate limit stats, drift check. Input/Output schemas will reference Zod definitions under `packages/types/src/mcp/` (to be added Phase 1).
4. Security/Observability/Audit: Secrets—Polar API key, Better Auth secret, Neon connection strings (env-specific), Cloudflare API token, GitHub PAT/app, Postman API key, OneSignal key, Mapbox key. All stored via environment secret management (no source). Audit logs for admin actions & MCP tool invocations (tool name, server, actor, durationMs, success, correlationId, resource summary). Structured redaction patterns applied (no raw tokens). Metrics: p95 latency per MCP server + drift counts + quota usage.
5. Monorepo Simplicity: No new packages beyond existing `apps/*` & `packages/{types,api-client,ui,utils,config}`; MCP tool schemas added to `packages/types` (extension, not new package). Complexity table not required.

Gate Status: PASS (No violations). Proceed to Phase 0 research.

## Project Structure
Documentation (feature):
```text
specs/005-dual-auth-architecture/
├── spec.md
├── plan.md
├── research.md          # (Phase 0)
├── data-model.md        # (Phase 1)
├── quickstart.md        # (Phase 1)
├── contracts/           # (Phase 1)
└── checklists/          # existing updated requirements
```
Source Code (existing monorepo):
```text
apps/
  api/ (Hono Workers API + Drizzle + Neon)
  web/ (Next.js user dashboard; will extend for admin separate? Currently single web—admin split TBD)
  mobile/ (Expo app; will branch into admin/user flows via route guards and env vars)
packages/
  types/ (Zod schemas including new MCP tool IO definitions)
  api-client/ (Typed client; will add dual token handling + billing endpoints)
  ui/ (Shared primitives; add admin vs user namespacing)
  utils/ (Auth helpers, rate limiting, redaction, environment detection)
  config/ (ESLint, Prettier, Tailwind config)
mcp/ (servers descriptors; extended entries added)
postman/ (collections for auth, github-secrets, integration; will add billing, MCP)
```
Structure Decision: Reuse existing apps with internal bifurcation for admin vs user (consider future physical split into `apps/admin-web`, `apps/admin-mobile`—deferred until spec demands; current phase maintains simplicity). Dual-session logic via token type claim + route namespaces. MCP descriptors extended inside `mcp/servers/`.

## Complexity Tracking
(No violations; table not required.)

## Constitution Re-Check (Post Design)
Artifacts produced: `research.md`, `data-model.md`, `contracts/openapi.yaml`, `contracts/mcp-tools.json`, `quickstart.md`.
Re-evaluation of gates:
1. Spec-First: Still aligned (no divergence). All new entities & endpoints traced to FRs.
2. Environment Parity: Read-only enforcement documented (`MCP_READ_ONLY`); idempotent keys defined. No parity drift.
3. Tool-/MCP Workflow: Tool list expanded; descriptors stubbed in `mcp-tools.json`; Zod schema parity planned in `packages/types` (Phase implementation).
4. Security/Observability/Audit: Audit schemas finalized; secret handling unchanged; hashing & token TTL decisions locked in.
5. Monorepo Simplicity: No new packages introduced; extensions confined to existing `packages/types` and `apps/api`.
Status: PASS. Ready for task breakdown (Phase 2 outside this plan scope).
