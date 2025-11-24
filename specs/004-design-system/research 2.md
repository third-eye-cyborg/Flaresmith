# Research: Unified Cross-Platform Design System

**Feature**: `004-design-system`  
**Date**: 2025-11-23  
**Scope**: Phase 0 research clarifying implementation decisions, performance, tooling, and risk mitigation. All functional requirements already clear; research focuses on execution strategies.

## Decisions Summary
Each decision includes: ID, Decision, Rationale, Alternatives Considered, Consequences.

### D-001 Token Snapshot Hash Algorithm
- **Decision**: Use SHA-256 over normalized JSON serialization (sorted keys) for token version hashing.
- **Rationale**: Cryptographic collision resistance ensures accurate drift detection and rollback fidelity; performance acceptable for ≤400 tokens.
- **Alternatives**: murmur3 (faster but non-cryptographic), xxhash (fast but requires extra dependency). 
- **Consequences**: Slightly higher CPU cost (<5ms) vs non-cryptographic; future scaling can introduce layered hash (fast prefilter + SHA-256 verify).

### D-002 Liquidglass Capability Detection
- **Decision**: Web: feature detect CSS backdrop-filter & prefers-reduced-transparency; Mobile: attempt RN blur module, fallback if memory pressure events or low GPU tier (expose capability flag).
- **Rationale**: Practical capability flags reduce rendering overhead and avoid degraded UX on unsupported devices.
- **Alternatives**: User agent heuristics (fragile), runtime performance probes (adds latency at startup).
- **Consequences**: Some edge-case devices may incorrectly report support; provide manual override env var for troubleshooting.

### D-003 Accessibility Audit Engine
- **Decision**: Implement internal OKLCH → relative luminance conversion + contrast ratio calculation (WCAG 2.1 formulas) rather than external dependency.
- **Rationale**: Control + avoids dependency bloat; OKLCH pipeline simpler for color transformations.
- **Alternatives**: colorjs (mature but adds bundle weight), tinycolor2 (legacy format).
- **Consequences**: Must maintain accuracy tests; initial verification against known contrast pairs.

### D-004 Drift Detection Diff Strategy
- **Decision**: Serialize tokens to ordered arrays grouped by category; compute per-category diff (added/removed/changed) then aggregate summary with counts & keys; store diff JSON.
- **Rationale**: Clear developer-facing diff; stable across minor formatting changes.
- **Alternatives**: JSON Patch (verbose for aggregated counts), deep object diff libs (less control).
- **Consequences**: Custom serializer maintenance; tests required for rename vs change semantics.

### D-005 Dark/Light Mode Merge Order
- **Decision**: Base → semantic → mode layer (light or dark) → override → experimental preview layer (optional). Last writer wins; reserved namespaces prevented from mode shadowing (e.g., `semantic.error`).
- **Rationale**: Predictable determinism; supports preview injection without destabilizing base tokens.
- **Alternatives**: Conditional merges per component; layered cascade with priority scoring.
- **Consequences**: Requires validation ensuring overrides cannot supersede restricted namespaces.

### D-006 Override Approval Workflow
- **Decision**: Store `status` enum (submitted|auto-applied|pending-approval|approved|rejected) + `size_pct` + `requiresApproval` bool. Approval endpoint transitions state with audit log entry.
- **Rationale**: Explicit state machine supports governance & metrics; simple transitions map to FR-023/024.
- **Alternatives**: Inline flag only; external queue service.
- **Consequences**: Minimal added complexity; Drizzle enum mapping required.

### D-007 Token Naming Lint Rule
- **Decision**: Custom ESLint rule reading token JSON snapshot; flags hard-coded style literals and invalid token names (regex + reserved namespace checks).
- **Rationale**: Integrates into existing lint pipeline; avoids bespoke CLI overhead.
- **Alternatives**: Separate script (harder developer feedback loop); Babel plugin (unnecessary complexity).
- **Consequences**: Slight lint performance cost; caching strategy needed.

### D-008 Circular Reference Detection
- **Decision**: DFS graph traversal of override token references; maintain visited + recursion stack sets; error code `DESIGN_OVERRIDE_CIRCULAR`.
- **Rationale**: Standard cycle detection; low complexity.
- **Alternatives**: Topological sort (overkill); runtime detection (late failure).
- **Consequences**: Need normalization of reference syntax (e.g., `token.primary.500`).

### D-009 Contrast Calculation Performance Optimization
- **Decision**: Precompute luminance for base palette tokens; store in `accessibility_meta`; reuse during audits.
- **Rationale**: Reduces repeated color parsing; faster audits.
- **Alternatives**: Compute on demand each audit run.
- **Consequences**: Must invalidate luminance cache on token change.

### D-010 Rollback Strategy
- **Decision**: Rollback endpoint selects version snapshot, re-applies token set (replaces current), invalidates drift events referencing old baseline, emits `design.rollback.completed` log, version increments.
- **Rationale**: Atomic multi-step ensures consistency and clear audit trail.
- **Alternatives**: Partial revert (complex), diff-based undo (error prone).
- **Consequences**: Requires concurrency guard (optimistic lock on current version id).

## Open Risks & Mitigations (Post-Decision)
| Risk | Status | Mitigation |
|------|--------|-----------|
| Lint rule false positives | Pending | Maintain allowlist for dynamic style computation cases |
| Accessibility audit edge cases (transparent colors) | Pending | Treat alpha < threshold as underlying background color approximation |
| Hash stability across serialization changes | Mitigated | Normalize ordering & stable stringify utility with tests |
| Multi-layer merge conflict complexity | Pending | Validation rule preventing override of reserved semantic namespaces |

## Implementation Notes
- Provide utility `normalizeTokens(tokens): NormalizedToken[]` for hashing & diff.
- Separate `designSystem` Zod schemas into modular files (tokens, overrides, audits) to minimize import overhead.
- Introduce `packages/utils/src/design/hash.ts` for stable hashing.
- Use Neon transaction for rollback to ensure atomic snapshot restore.

## Next Steps
Proceed to Phase 1 design artifacts: `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`, Zod schemas, MCP tool stubs.
