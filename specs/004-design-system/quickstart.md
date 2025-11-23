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

## Preview Experimental Token Layer (FR-019)
The preview layer enables time-boxed experimentation with new token definitions (e.g. intermediate accent scales, advanced blur levels) without persisting them to the database.

| File | Purpose |
|------|---------|
| `packages/config/tailwind/tokens.preview.json` | Defines experimental tokens (accent.450, accent.475, glass.blur.xxl, glass.opacity.ultra, elevation.3xl) |

### Enable Preview
Set the environment variable `DESIGN_PREVIEW=true` before running the generation script:

```bash
DESIGN_PREVIEW=true pnpm exec tsx scripts/design/generateTokenConfigs.ts
```

The script will log `🧪 Loaded preview tokens` and inject the layer with priority after overrides.

### Disable Preview
Unset the variable (or set to empty) and regenerate:

```bash
unset DESIGN_PREVIEW
pnpm exec tsx scripts/design/generateTokenConfigs.ts
```

### Safety & Governance
1. Preview tokens never write to `design_tokens` or version snapshots.
2. Reserved semantic namespaces (error|warning|success|info) remain protected.
3. Drift detection compares baseline without preview; enabling preview should temporarily show diff only in preview token names.
4. Accessibility audits SHOULD be re-run with preview active before enabling in staging.
5. Production CI MUST run without `DESIGN_PREVIEW` unless explicitly allowed by a feature flag commit tag `[preview]`.

### Rollback / Removal
Simply regenerate without the env var. Hash should match previous non-preview version (unless other changes were introduced). This validates convergent behavior.

## Mode Switching & Latency (FR-017 / SC-006)
Dark/Light mode tokens live in:
* `packages/config/tailwind/tokens.light.json`
* `packages/config/tailwind/tokens.dark.json`

Merge order selects one of these based on active mode. Web uses `next-themes` and mobile uses a custom React Context. Latency is measured as:

```text
latencyMs = (post-paint timestamp) - (toggle initiation timestamp)
```

### Measuring Latency
Web: `ThemeToggle` logs `[theme-switch] mode=<mode> latencyMs=<ms>` to the console and pushes records into `window.__themeLatencyStats.web`.

Mobile: Toggle logs `[mobile-theme-switch] mode=<mode> latencyMs=<ms>` and stores entries in `global.__themeLatencyStats.mobile`.

### Targets
| Platform | Target (p95) |
|----------|--------------|
| Web | ≤ 100ms |
| Mobile | ≤ 150ms |

Run a manual benchmark by switching modes 25 times and computing p95 from the collected array. Investigate regressions > target (suspect large re-render regions, heavy layout shifts, or synchronous token recomputation).

## Success Criteria Adjusted Mapping
| ID | Description | Source |
|----|-------------|--------|
| SC-001 | ≥95% semantic color parity web/mobile | snapshot diff script T029 |
| SC-002 | Token propagation ≤5m CI | future CI metric T111 |
| SC-003 | Accessibility AA ≥98% pairs | audit report T068 |
| SC-004 | Override validation blocks malformed/circular 100% | override service T047-T051 |
| SC-005 | ≥90% reduction duplicated style literals | migration baseline T095 |
| SC-006 | Mode switch latency ≤ targets | toggle telemetry T100 + T101 + T102 |
| SC-007 | Liquidglass fallback success ≥99% | capability metrics T045 |
| SC-008 | Drift blocks all divergent merges | CI gate T072 |
| SC-009 | Override bundle impact ≤ thresholds | analyzer T109 |
| SC-010 | Rollback completes ≤60s | rollback timing T079 |


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
