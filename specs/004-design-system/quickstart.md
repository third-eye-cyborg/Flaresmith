# Quickstart: Unified Design System (Feature 004)

## Purpose
Enable cross-platform (Web/Next.js, Mobile/Expo) consumption of unified design tokens + component variants with governance (override workflow, accessibility audits, drift detection, rollback).

## Prerequisites
- Monorepo bootstrapped (`pnpm install` successful)
- Environment: Node 20+, pnpm
- Branch: `004-design-system`
- Spec: `specs/004-design-system/spec.md` (source of truth)

## Workflow Overview
1. Generate / update token Zod schemas
2. Apply overrides (auto / approval workflow)
3. Run accessibility audit (light/dark)
4. Detect drift vs spec
5. Rollback if regression identified

## Commands (Planned Scripts)
```bash
# Validate token schema integrity
pnpm exec ts-node scripts/design/validateTokens.ts

# Submit override (example payload via curl)
curl -X POST $API/design/overrides -d '{"environment":"dev","diff":[{"name":"primary.blue.500","newValue":"#2266dd"}]}' -H 'Content-Type: application/json'

# Run accessibility audit (dark mode)
curl -X POST $API/design/audits/run -d '{"mode":"dark"}'

# Detect drift
curl $API/design/drift

# Rollback tokens to version 12
curl -X POST $API/design/rollback -d '{"targetVersion":12,"rationale":"Revert after failed experiment"}'
```

## Token Layer Merge Order
`base → semantic → mode (light/dark) → override → preview-experimental`

## Override Governance Rules
- size_pct ≤ 5% AND no new namespaces ⇒ auto-applied
- size_pct > 5% OR new namespace ⇒ pending-approval
- size_pct > 10% ⇒ reject (policy)

## Accessibility Audit Criteria
- Contrast >= 4.5 normal text, >= 3.0 large text
- Status levels: pass | warn | fail
- Target: ≥ 95% AA compliance (SC-004)

## Drift Detection Trigger
Run scheduled daily OR manual invocation if design tokens updated. Drift event created only when hash differs from baseline.

## Rollback Safety
- Only designDelegates+, platformOwner can rollback prod
- Rollback generates new snapshot version (immutable history)
- Audited post-rollback automatically

## Integration Points
- Tailwind (web) tokens → `packages/config/tailwind/*`
- NativeWind (mobile) tokens → `packages/ui/src/tokens/nativewind.ts`
- shadcn components reference semantic tokens
- Liquidglass variants use glass + elevation tokens

## Logging Events
See `data-model.md` for event list; confirm presence in structured logger output.

## Next Steps
1. Implement Zod schemas (`packages/types/src/designSystem.ts`)
2. Add Hono routes per OpenAPI spec
3. Generate client wrappers (`packages/api-client/src/resources/designSystem.ts`)
4. Add MCP tool descriptors (`mcp/servers/design-system/*.json`)
5. Write tests (Vitest) for overrides, drift, rollback, audit

## Success Criteria Mapping
- SC-001: Token generation time — measure in script runtime logs
- SC-004: Accessibility pass % — from latest audit report
- SC-006: Override decision latency — timestamp diff (submitted vs applied)
- SC-010: Rollback completion < 2s — measure durationMs in rollback event

---
Refer back to spec for any change justification; all modifications MUST cite FR or SC identifier.
