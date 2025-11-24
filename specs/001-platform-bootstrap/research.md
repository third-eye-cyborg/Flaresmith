# Research: Platform Bootstrap

## Overview
Phase 0 resolves clarifications and establishes key implementation decisions for adapters, testing strategy, MCP client library selection, and CodeMirror scaling. Branding note: Project renamed to Flaresmith (formerly CloudMake) — decisions unaffected.

## Decisions

### D-001 Backend Framework for Cloudflare
- **Decision**: Use Hono on Cloudflare Workers (edge-native) instead of Express + adapter.
- **Rationale**: Instant cold starts, global edge latency, minimal polyfills, strong DX; avoids adapter complexity and performance overhead.
- **Alternatives Considered**:
  - Express + Workers adapter/polyfills: Compatibility gaps, added latency, maintenance burden.
  - Cloudflare Containers: Full Node compat but introduces cold starts and higher operational cost.

### D-002 Postman Collection Structure Depth
- **Decision**: Hybrid structure: Base collection with all endpoints + environment-specific collections (dev/staging/prod) carrying env variables and pre-configured requests.
- **Rationale**: Keeps change surface centralized while enabling per-env auth/URL/test variations; simplifies CI runs per environment.
- **Alternatives**: Single collection only (less flexibility); multiple per-domain collections (diffusion/maintenance overhead).

### D-003 CodeMirror Large File Pagination Strategy
- **Decision**: Lazy load file content with range requests using GitHub API (fetch blob size & fetch slices for >1MB files; cap editing to <2MB initially).
- **Rationale**: Avoids loading big binary or generated bundles; respects browser memory; incremental streaming possible later.
- **Alternatives**: Full fetch upfront (memory heavy), server-side proxy streaming (adds infra complexity early), chunked websocket (overkill for bootstrap).

### D-004 Testing Stack Consolidation
- **Decision**: Primary test runner Vitest for unit + integration (Node + jsdom). Jest only if React Native module demands incompatibility; attempt RN integration via Expo + Vitest early.
- **Rationale**: Performance and TypeScript integration; reduces duplication.
- **Alternatives**: Jest everywhere (slower), dual runners (complexity cost) / Cypress for API (redundant given Postman + Playwright).

### D-005 React Native Web + NativeWind Theming
- **Decision**: Use NativeWind tokens mapped to Tailwind config (shared theme in packages/config). Design token sync from Figma later; placeholder palette now.
- **Rationale**: Unified styling across web/mobile; platform primitives reuse.
- **Alternatives**: Separate Tailwind + RN StyleSheet (divergent style definitions), styled-components (extra runtime cost).

### D-006 MCP Client Library
- **Decision**: Implement thin internal client using WebSocket + JSON-RPC over standardized MCP protocol (NEEDS CLARIFICATION: final stable 2.0 spec version). Abstract provider registry in `packages/api-client`.
- **Rationale**: Avoid premature dependency on evolving external library; maintain control over tool discovery caching.
- **Alternatives**: Adopt early external MCP 2.0 beta (risk of breaking changes), custom per-provider clients (duplication).

### D-011 Pagination Strategy
- **Decision**: Cursor-based pagination with opaque cursor and limit parameters; responses include hasMore and nextCursor.
- **Rationale**: Stable under concurrent writes; better performance vs OFFSET for large datasets; aligns with serverless patterns.
- **Alternatives**: Offset-based (susceptible to drift); page token encoding state (added complexity without clear benefit now).

### D-012 Entity ID Format
- **Decision**: UUID v4 for all entities (Project, Environment, IntegrationConfig, Deployment, Build, User, Organization, SpecArtifact, MCPToolDescriptor, ChatSession, Codespace, Repo).
- **Rationale**: Non-enumerable IDs, distributed generation, Neon UUID type support.
- **Alternatives**: Auto-increment ints (enumeration risk), NanoID/CUID (shorter but less standard across tooling).

### D-013 WebSocket Authentication
- **Decision**: JWT passed as URL query parameter (wss://api/chat?token=jwt) for chat/stream endpoint.
- **Rationale**: Universal client compatibility; validate before upgrade; compatible with Workers/Durable Objects.
- **Alternatives**: Sec-WebSocket-Protocol header (browser support caveats), initial message auth (extra RTT), cookies (browser-only, CSRF concerns).

### D-007 Idempotency Implementation
- **Decision**: Use Neon table `idempotency_keys` storing (key, resourceType, lastStatus, checksum) with unique constraint; operations check before create.
- **Rationale**: Guarantees convergence; facilitates audit & replay.
- **Alternatives**: In-memory cache (lost on restart), external KV (extra dependency early).

### D-008 Logging & Correlation IDs
- **Decision**: Generate correlationId per request; propagate through provisioning chain; structured logs via pino-like logger with Cloudflare Workers binding fallback.
- **Rationale**: Standard pattern; easy integration with future structured ingestion.
- **Alternatives**: Console.log only (insufficient), heavy APM vendor early (cost).

### D-009 Spec Apply Codegen
- **Decision**: Implement deterministic generators in `scripts/` referencing Zod schema definitions; diff detection via textual AST compare (simple JSON structure).
- **Rationale**: Keeps output stable; visible diffs in PRs; reproducible.
- **Alternatives**: AST heavy parsing library (complex for bootstrap), ad-hoc string concatenation (fragile).

### D-010 Promotion Workflow
- **Decision**: GitHub Actions job merges dev feature branch → staging via PR; staging → main via reviewed PR; environment sync tasks invoked post-merge with idempotency keys.
- **Rationale**: Aligns with traceability and audit principles.
- **Alternatives**: Direct pushes (lose review), custom scripts (less visibility).

### D-011 Rollback Support by Provider (addresses FR-016 clarification)
- **Cloudflare Workers/Pages**: Supports rollback via deployment history; can revert to previous deployment ID.
- **GitHub**: Branch rollback via git revert/reset; environment deployments tracked but no native rollback API (manual revert commits).
- **Neon**: Database branch rollback supported via branching API (restore from parent or previous branch state).
- **Postman**: Collections/environments versioned but no automated rollback (manual restore from version history).
- **Implementation**: Rollback service in apps/api/src/services/rollbackService.ts will support Cloudflare and Neon programmatic rollback; GitHub and Postman require manual/assisted workflows.

## Outstanding Clarifications
- MCP protocol finalized spec version reference (await official publication) → placeholder accepted.
- RN Jest compatibility final validation.

## Risk Register (Early)
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Adapter complexity for Workers | Delays production deploy | Start with subset of routes; fall back to Node in early prod if needed |
| Large spec-driven codegen churn | Hard-to-review diffs | Deterministic ordering + stable formatting |
| Integration token scoping errors | Security exposure | Implement secret scanning pre-commit & CI validation |
| Concurrent chat edits conflict | Lost changes | Implement optimistic locking with commit base SHA verification |

## Decision Traceability
All decisions above map to Constitution Principles: Spec-First (D-009), Environment Parity (D-010), Tool-Centric (D-006), Security/Audit (D-007/D-008), Monorepo Simplicity (D-004/D-005).
