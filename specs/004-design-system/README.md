# Design System (Feature 004)

## Overview
A unified, spec-first design system providing deterministic token generation and cross-platform component variants (Web/Next.js + Mobile/Expo) with strict governance: overrides, accessibility audits, drift detection, versioning & rollback, preview experimentation, and performance instrumentation.

## Goals
- Single source of truth for semantic + foundational tokens (SC-001 parity ≥95%)
- Fast propagation (SC-002 ≤5m commit→availability)
- Near-perfect accessibility (SC-003 ≥98% AA pairs)
- Safe override workflow (FR-024/025, SC-009 bundle thresholds)
- Mode switching with low latency (SC-006 p95 web ≤100ms, mobile ≤150ms)
- Liquidglass graceful fallback (SC-007 ≥99%)
- Drift prevention (SC-008 100% block)
- Rollback speed (SC-010 ≤60s)

## Token Layering
```
base → semantic → mode(light|dark) → override → preview(experimental)
```
Utilities compose layers via `mergeTokens.ts` ensuring predictable precedence.

| Layer | Source | Notes |
|-------|--------|-------|
| base | `tokens.base.json` | Structural primitives (color, spacing, radius, elevation) |
| semantic | DB (`design_tokens`) | Meaningful names (primary.bg, accent.fg) |
| mode | `tokens.light.json` / `tokens.dark.json` | Scoped adjustments for contrast / brand intents |
| override | DB (`design_overrides`) | Environment-specific diffs (policy enforced) |
| preview | `tokens.preview.json` (env gated) | Non-persistent experimental tokens |

## Core Files
| Purpose | Path |
|---------|------|
| DB Schema | `apps/api/db/schema/designSystem.ts` |
| Generation Script | `scripts/design/generateTokenConfigs.ts` |
| Merge Utility | `packages/utils/src/designSystem/mergeTokens.ts` |
| Token Service | `apps/api/src/services/designSystem/tokenService.ts` |
| Accessibility Audit Service | `apps/api/src/services/designSystem/accessibilityAuditService.ts` |
| Override Services | `apps/api/src/services/designSystem/override*Service.ts` |
| Drift Detection Service | `apps/api/src/services/designSystem/driftDetectionService.ts` |
| Rollback Service | `apps/api/src/services/designSystem/rollbackService.ts` |
| Capability Detection | `packages/utils/src/designSystem/capabilityDetection.ts` |
| Parity Validation | `scripts/design/validateTokenParity.ts` |
| Bundle Impact | `scripts/design/analyzeBundleSize.ts` |
| Propagation Tracking | `scripts/design/trackPropagation.ts` |

## Governance & Policies
| Policy | Rule |
|--------|------|
| Override Size | ≤5% auto, 5–10% approval, >10% reject |
| Rate Limits | Standard 20/day (5/hr burst), Premium 40/day |
| Accessibility | Contrast AA (4.5:1 normal, 3:1 large) |
| Reserved Namespaces | `accent`, `primary`, `glass`, `elevation`, `semantic.*` |
| Preview Safety | No DB writes, excluded from version snapshots |
| Rollback Permissions | `designDelegate` or `platformOwner` for prod |

## Observability & Metrics
- `tokenService` counters: totalCalls, cachedHits, avgDurationMs
- Mode switch latency arrays (web/mobile globals)
- Accessibility audit durationMs + passed_pct
- Drift events stored in `design_drift_events`
- Rollback durationMs in audit log
- Bundle analyzer deltas JSON output
- Propagation JSON (commitTs, genTs, propagationMs)

## Typical Workflows
1. Add token → generate → parity validate → commit & track propagation
2. Submit override → approval (if needed) → regenerate → analyze bundle size
3. Run audits (light/dark) → verify ≥98% → adjust tokens if failing
4. Detect drift before merge → resolve spec or implementation → re-check
5. Rollback problematic version → regenerate → revalidate parity + drift
6. Enable preview for experiment → visual audit → disable preview for convergence

See `quickstart.md` for commands and detailed examples.

## Error Codes (Excerpt)
Documented in `apps/api/src/types/errors.ts`:
- DESIGN_OVERRIDE_TOO_LARGE
- DESIGN_OVERRIDE_RATE_LIMIT
- DESIGN_OVERRIDE_CIRCULAR_REFERENCE
- DESIGN_OVERRIDE_INVALID_COLOR
- DESIGN_ROLLBACK_PERMISSION_DENIED
- DESIGN_DRIFT_DETECTED
- DESIGN_ACCESSIBILITY_THRESHOLD_UNMET
(Plus performance / cache advisories if added)

## Success Criteria Mapping
| SC | Validation Path |
|----|-----------------|
| SC-001 | `validateTokenParity.ts` output parity≥95% |
| SC-002 | `trackPropagation.ts` withinTarget=true |
| SC-003 | latest audit passed_pct≥98% |
| SC-004 | override validator rejects malformed/circular 100% |
| SC-005 | migration script diff reduction≥90% |
| SC-006 | latency arrays p95 within targets |
| SC-007 | capability metrics fallback success≥99% |
| SC-008 | drift endpoint hasDrift=false pre-merge |
| SC-009 | bundle analyzer deltas within thresholds |
| SC-010 | rollback durationMs≤60000 |

## MCP Tooling
Registered descriptors at `mcp/servers/design-system/*.json` enabling AI agents:
- getTokens
- applyOverride
- rollbackTokens
- detectDrift
- auditAccessibility
- getLatestAudit

## Extensibility Principles
- Add new token category: update base file + Zod schema; avoid duplication
- All new operations: spec-first (update `spec.md` + OpenAPI contract) before implementation
- Idempotent scripts: regeneration converges unless inputs change

## Preview Mode Caveats
- Must not be enabled in production CI (ensure `DESIGN_PREVIEW` absent)
- Accessibility + parity validations may temporarily fail due to experimental values
- Remove preview layer before final audits

## Component Showcase (Upcoming T117)
`apps/web/app/design/showcase/page.tsx` will render primitives with variant & mode toggles for manual visual QA.

## Contributing
1. Propose spec change referencing FR/SC
2. Update Zod & DB schema if needed
3. Implement services/routes
4. Add/extend MCP tools
5. Update quickstart + README
6. Validate SC metrics via full validation script (T116)

## Future Enhancements
- Automated p95 latency computation endpoint
- Color contrast simulation (CVD filters) integration
- Token deprecation workflow with diff gating

---
Design System changes MUST trace to spec requirements. No ad-hoc token additions.
