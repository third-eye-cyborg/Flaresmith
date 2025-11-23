# Implementation Plan: Unified Cross-Platform Design System

**Branch**: `004-design-system` | **Date**: 2025-11-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-design-system/spec.md`

**Note**: Manual creation due to setup-plan script copy permission issues. Structure modeled after existing feature plans.

## Summary
Establish a token-driven, cross-platform design system unifying Tailwind (web), NativeWind (mobile), shadcn-style component patterns, and Liquidglass visual theming. Provides governance for environment-scoped overrides, accessibility audits, drift detection, rollback, and MCP tool exposure of token snapshots. Outcome: Rapid, consistent UI evolution with reduced duplication (≥90% style literal reduction) and safe extensibility for user-generated apps.

## Technical Context
**Languages**: TypeScript 5.x (strict), React/React Native, CSS (Tailwind), NativeWind
**Frameworks**: Next.js 14 (App Router), Expo (NativeWind), Hono (Workers) for override APIs, Drizzle + Neon for persistence (token versions, audits, overrides), shadcn pattern (web components), Liquidglass layer (CSS filters + RN blur/saturation fallback)
**Primary Packages Affected**:
- `packages/types` (designSystem schemas: tokens, overrides, variants, accessibility)
- `packages/config/tailwind` (generated consolidated tailwind configs & tokens export)
- `packages/ui` (cross-platform primitives: Button, Card, Badge, Input, Modal)
- `packages/api-client` (design system API resources: tokens, overrides, audits, rollback)
- `apps/api` (routes: `/design/tokens`, `/design/overrides`, `/design/audits`, `/design/rollback`, `/design/drift`)
- `scripts/spec` (driftDetector extension for tokens)
- `mcp/servers/design-system` (MCP tool descriptors: getTokens, applyOverride, auditAccessibility, rollbackTokens, detectDrift)

**Data Storage**:
- Neon Postgres tables: `design_tokens` (current set), `design_token_versions` (snapshots), `design_overrides` (submitted overrides), `design_accessibility_audits`, `design_drift_events`
- Generated build artifacts: `packages/config/tailwind/tokens.generated.ts`, `packages/config/tailwind/nativewind.generated.ts`, `packages/config/tailwind/tokens.json`

**Performance Goals**:
- Token generation + config build ≤ 10s local dev, ≤ 60s CI
- Drift detection endpoint p95 < 400ms (compares hash + diff summary)
- Accessibility audit ≤ 5s for ≤ 300 token color pairs
- Dark/light mode switch latency ≤ 100ms web, ≤ 150ms mobile (SC-006)

**Constraints**:
- Accessibility contrast thresholds AA (4.5:1 normal, 3:1 large)
- Override size policy sliding scale (≤5% auto, 5–10% approval, >10% reject)
- Rate limits: Standard 20/day (≤5/hour), Premium 40/day (≤5/hour)
- Fallback path for unsupported Liquidglass: use elevation + solid token
- Idempotent operations: override application, rollback, drift detection

**Dependencies**:
- Existing logging & redaction middleware (extend for token override events)
- JWT auth infrastructure for permission model (roles: platformOwner, projectAdmin, designDelegate)
- Diff hashing utility (extend `packages/utils` with stable hash algorithm for token sets)

**Scale/Scope**:
- Initial token set: ≤ 400 tokens (color, spacing, typography, radius, elevation, glass, semantic*)
- Overrides: ≤ 40 tokens per override (≤10%) before rejection
- Accessibility audits: target up to 100 text/background pairs per mode

## Constitution Check (Pre-Design Gate)

### 1. Spec-First Orchestration ✅ PASS
Spec directory exists with user stories (3), functional requirements (FR-001–FR-025), success criteria (SC-001–SC-010), decisions resolved. No remaining NEEDS CLARIFICATION markers.

### 2. Environment Parity & Idempotent Automation ✅ PASS
Overrides are environment-scoped (dev/staging/prod) with identical structure; token generation deterministic. Rollback and override application use idempotency keys: `${projectId}-design-override-${overrideId}`. Promotion gating: invalid override blocks staging→prod.

### 3. Tool-/MCP-Centric AI Workflow ✅ PASS
Planned MCP tools: `design.getTokens`, `design.applyOverride`, `design.auditAccessibility`, `design.rollbackTokens`, `design.detectDrift`. All will reference Zod schemas in `packages/types/src/designSystem.ts`.

### 4. Security, Observability & Audit ✅ PASS
No secrets stored; override submissions logged with correlationId, diff summary hash (no raw color values for sensitive namespaces). Rate limit enforcement logs audit events. Rollback actions audit actor + version.

### 5. Monorepo Simplicity & Reusable Primitives ✅ PASS
No new top-level packages; extend existing `packages/ui`, `packages/types`, and `packages/config/tailwind`. Shared primitives reused. Complexity table not required.

**Gate Result**: ✅ All gates passed → Proceed to Phase 0 Research.

## Phase 0: Research (Outline)
Research tasks (all derived decisions already stable; focus on implementation detail refinement & risk mitigation):
1. Hash strategy for token version snapshots (evaluate SHA-256 vs murmur3 for speed).  
2. Liquidglass performance fallback thresholds (GPU capability heuristics vs user agent feature detection).  
3. Accessibility audit tooling choice (internal contrast calc vs external lib like colorjs).  
4. Drift detection diff algorithm (JSON patch vs field-wise vs semantic grouping).  
5. Dark/light mode merging order best practices (layer precedence and conflict resolution).  
6. Override approval workflow implementation path (DB workflow state vs inline flag + event log).  
7. Token naming lint rule approach (ESLint plugin vs custom script).  

(Resolved governance decisions recorded; no unknown functional requirements remain.)

## Phase 0 Output Plan
- `research.md`: Decisions (D-001..D-010) with rationale + alternatives.

## Phase 1: Design & Contracts
Artifacts to produce:
- `data-model.md`: Entities, fields, relationships, state transitions, indexing strategy.
- `contracts/openapi.yaml`: Endpoints:
  - `GET /design/tokens` (list current tokens + version)
  - `POST /design/overrides` (submit override)
  - `GET /design/overrides/:id` (status + diff)
  - `POST /design/rollback` (rollback to version)
  - `GET /design/drift` (current drift status, diff summary)
  - `GET /design/audits/latest` (latest accessibility report)
  - `POST /design/audits/run` (trigger audit)
- `quickstart.md`: Steps to add token, apply override, run audit, detect drift, rollback.
- Generated initial token schema `packages/types/src/designSystem.ts` (Zod) including:
  - `DesignToken`, `DesignTokenSet`, `ThemeOverride`, `ComponentVariant`, `TokenVersionSnapshot`, `AccessibilityAuditResult`.
- MCP tool descriptor stubs (Phase 1 design only; actual files Phase 2 implementation).

## Phase 1 Output Plan
- Generate JSON schema exports for MCP use under `contracts/schemas/`.
- Provide example override payloads and audit report structure.

## Phase 2: Tasks Generation (Future /speckit.tasks)
Will decompose into user story slices:
- P1: Token unification + primitives + generation pipeline
- P2: Component variants + Liquidglass layer + accessibility audits
- P3: Overrides API + approval workflow + drift detection + rollback

## Data Model (Preview Summary)
(Full details in `data-model.md` Phase 1)
- `design_tokens(id uuid PK, name text UNIQUE, category text, value jsonb, version int, accessibility_meta jsonb, created_at timestamptz)`
- `design_token_versions(id uuid PK, version int, snapshot jsonb, hash text UNIQUE, created_at timestamptz, created_by uuid)`
- `design_overrides(id uuid PK, project_id uuid, environment text, submitted_by uuid, status text, token_diff jsonb, size_pct int, approved_by uuid NULL, created_at timestamptz)`
- `design_accessibility_audits(id uuid PK, version int, mode text, report jsonb, passed_pct int, created_at timestamptz)`
- `design_drift_events(id uuid PK, baseline_version int, current_hash text, diff jsonb, created_at timestamptz)`
Indexes to optimize diff & retrieval operations; foreign key relationships on version references.

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Performance degradation from Liquidglass filters | Capability detection + fallback tokens |
| Override abuse (spam) | Rate limits + audit logging + approval workflow |
| Accessibility regressions | Mandatory audit gate before staging→prod promotion |
| Drift false positives | Stable hashing + normalized serialization order |
| Token explosion (>400) | Lint rule enforcing namespace discipline, periodic review |

## Success Criteria Mapping
| SC | Implementation Hooks |
|----|----------------------|
| SC-001 | Snapshot diff tests (web vs mobile semantic tokens) |
| SC-002 | CI timers for token generation + build completion |
| SC-003 | Accessibility audit runner metrics (pass ratio) |
| SC-004 | Override validator (circular + malformed detection) |
| SC-005 | ESLint style literal rule before/after counts |
| SC-006 | Performance measurement hook wrapping mode switch function |
| SC-007 | Fallback decision metrics (capability detection success rate) |
| SC-008 | Drift detector blocking merge when hash mismatch present |
| SC-009 | Bundle analyzer script comparing size pre/post override layer |
| SC-010 | Rollback endpoint duration metric |

## Post-Design Constitution Re-Check

### 1. Spec-First Orchestration ✅ PASS
All Phase 1 artifacts (data-model.md, openapi.yaml, quickstart.md) trace directly to spec FR/SC. API endpoints map to FR-001 (centralized tokens), FR-005 (overrides), FR-006 (validation), FR-012 (accessibility), FR-008 (drift), FR-015 (rollback). Entity design implements Key Entities requirements.

### 2. Environment Parity & Idempotent Automation ✅ PASS
Override status state machine documented in data-model.md maintains environment consistency (dev/staging/prod). Rollback flow ensures reversible operations. API endpoints designed with idempotent behavior (repeated calls converge).

### 3. Tool-/MCP-Centric AI Workflow ✅ PASS (Pending Implementation)
OpenAPI contract establishes 7 endpoints ready for MCP tool descriptors. Zod schemas planned in `packages/types/src/designSystem.ts` to serve as input/output validation. MCP tool generation deferred to Phase 2 implementation.

### 4. Security, Observability & Audit ✅ PASS
Data model includes audit events (override.submitted, override.applied, override.rejected, tokens.version.created, tokens.rollback.completed, drift.detected, accessibility.audit.completed). Override diffs store structured changes (not raw secret-like values). Rate limiting enforced per FR-025.

### 5. Monorepo Simplicity & Reusable Primitives ✅ PASS
Design uses existing package structure: `packages/types` for schemas, `packages/config/tailwind` for generation output, `packages/ui` for primitives, `apps/api` for routes. No new top-level packages introduced. Shared token logic centralized.

### Additional NFRs ✅ PASS
- Performance targets documented (≤10s local gen, ≤5s audits, ≤100/150ms mode switch)
- Security model documented (permission roles, approval workflow, rate limiting)
- Observability events enumerated in data-model.md
- Versioning strategy via immutable snapshots enables rollback (FR-015)

**Gate Result**: ✅ All Constitution principles satisfied post-design. Ready to proceed to Phase 2 (task generation).

## Delivery Checklist (Live Tracking)
- [x] Phase 0 research.md created
- [x] Phase 1 data-model.md created
- [x] Phase 1 contracts/openapi.yaml created
- [x] Phase 1 contracts/schemas/* generated (token.json, override.json, accessibility-audit.json, drift.json)
- [x] Phase 1 quickstart.md created
- [x] Zod schemas in `packages/types/src/designSystem.ts`
- [x] MCP tool descriptors (6 tools: getTokens, applyOverride, rollbackTokens, detectDrift, auditAccessibility, getLatestAudit)
- [ ] Agent context updated (script blocked by permissions; manual update deferred)
- [x] Constitution re-check updated
- [x] tasks.md generated (117 tasks across 11 phases)

**Phase 1 Complete**: All design artifacts generated. **Phase 2 Ready**: Task decomposition complete. Ready for implementation.

## Next Command
After completing Phase 1 artifacts and updating this plan: run `/speckit.tasks` to generate implementation tasks.
