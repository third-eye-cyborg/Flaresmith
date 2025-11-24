# Feature Specification: Unified Cross-Platform Design System

**Feature Branch**: `001-design-system`
**Created**: 2025-11-23  
**Status**: Draft  
**Input**: User description: "Use Tailwind, NativeWind, shadcn, and Liquidglass for unified design systems across web, mobile, and user-generated apps; provide tokenized theme, component primitives, and extensible styling orchestration that aligns with spec-first workflow and environment parity."

## Vision & Summary *(optional)*
Establish a unified, token-driven, cross-platform design system that powers: (1) internal Web (Next.js) and Mobile (Expo/NativeWind) applications, and (2) user-generated apps built on the CloudMake platform. The system harmonizes Tailwind (web), NativeWind (mobile), shadcn component patterns, and Liquidglass visual theming (glassmorphism/dynamic translucency) through a single source of truth for design tokens defined in specs and exported via `packages/config/tailwind/` and future `packages/types/src/designSystem.ts` schemas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core Token Unification (Priority: P1)
Platform maintainers define design tokens (color palette, spacing scale, typography, elevation, radiance, translucency) once and consume them consistently in web (Tailwind), mobile (NativeWind), and shared UI primitives without duplication.

**Why this priority**: Token convergence is foundational—without it subsequent component libraries, theming, and user extensibility fragment.

**Independent Test**: Update a primary color token; verify web button, mobile button, and shared primitive reflect change after a single build across dev environment.

**Acceptance Scenarios**:
1. **Given** a change to `primary.500` token, **When** rebuilding apps, **Then** both web and mobile primary buttons render the updated color.
2. **Given** token definitions exist, **When** consuming them in a shared cross-platform `Button` primitive, **Then** no inline hard-coded color values appear in component code.

---

### User Story 2 - Component Library Integration (Priority: P2)
shadcn-derived component patterns (web) and NativeWind-based primitives (mobile) align to a unified prop and variant model exposed via shared types; component theming uses tokens and optionally Liquidglass variants.

**Why this priority**: Consistent component API accelerates feature development and reduces cognitive load across platforms.

**Independent Test**: Implement a `Card` component variant ("elevated" vs "glass") in web and mobile using the same variant enum and tokens; verify props validated by shared Zod schema.

**Acceptance Scenarios**:
1. **Given** a shared `CardVariant` schema, **When** using `variant="glass"` on web and mobile, **Then** each renders translucent background respecting global opacity token.
2. **Given** a new component `Badge` defined in tokens and variant schema, **When** imported into both apps, **Then** design tokens are the only source of styling values.

---

### User Story 3 - User-Extensible Theming (Priority: P3)
Project owners can define custom theme overrides (subset of tokens) per environment (dev/staging/prod) and per user-generated app, with safe fallbacks and validation.

**Why this priority**: Enables branding and customization while preserving system integrity and parity across environments.

**Independent Test**: Create an override file specifying new accent color for a user app in staging; verify only accent-dependent components change and logs show validated, merged token set.

**Acceptance Scenarios**:
1. **Given** a theme override providing `accent.600`, **When** deployed to staging, **Then** staging web and mobile builds reflect the override without affecting dev/prod.
2. **Given** an invalid override (out-of-gamut color), **When** validation runs, **Then** system rejects it with a structured error referencing token name.

---

### Edge Cases
- Override introduces circular reference (token A referencing token B referencing A) → must detect and fail gracefully.
- Missing required contrast ratios for accessible variants → fallback to base palette and log warning.
- Liquidglass translucency on low-end devices (mobile) → degrade gracefully to solid background.
- Extremely long custom token names → reject (>32 chars) with validation error.
- Concurrent token updates across branches → detect drift (spec parity) before merge.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST centralize design tokens (colors, spacing, typography, radius, elevation, translucency) in a single spec-derived schema.
- **FR-002**: System MUST generate Tailwind config and NativeWind theme from the same token source automatically during `pnpm dev` / build.
- **FR-003**: System MUST provide shared Zod schemas for component variants and theming overrides (`packages/types/src/designSystem.ts`).
- **FR-004**: System MUST support Liquidglass-style translucency via tokens controlling blur, opacity, saturation (e.g., `glass.blurMd`, `glass.opacityLight`).
- **FR-005**: System MUST allow environment-specific theme overrides (dev/staging/prod) applied deterministically via idempotent merge.
- **FR-006**: System MUST validate user-provided theme overrides (color format, contrast threshold AA/AAA for text tokens, non-circular references).
- **FR-007**: System MUST expose a normalized component primitive API (e.g., Button, Card, Badge) across web/mobile with shared variant enums.
- **FR-008**: System MUST provide a diff/drift detector to identify divergence between spec tokens and generated configs before merge.
- **FR-009**: System MUST support token change propagation completing within one build cycle (<5 minutes CI target).
- **FR-010**: System MUST log token override application events with correlationId and environmentId (no raw color values if flagged sensitive). 
- **FR-011**: System MUST ensure fallbacks when Liquidglass effects unsupported (GPU/OS detection) without runtime errors.
- **FR-012**: System MUST provide accessibility audit for contrast on key text/background pairings pre-build.
- **FR-013**: System MUST allow safe extension of component variants by user apps limited to documented extension points.
- **FR-014**: System MUST surface validation errors via structured spec-first error envelope.
- **FR-015**: System MUST version token sets (semantic version) to allow rollback.
- **FR-016**: System MUST publish token snapshot (JSON) for MCP tool consumption.
- **FR-017**: System MUST support dark/light mode token layers with deterministic merging order.
- **FR-018**: System MUST provide a migration path for legacy inline styles (lint rule + fixer).
- **FR-019**: System MUST support atomic "design preview" mode injecting experimental token layer without affecting production build.
- **FR-020**: System MUST document token naming conventions and reserved namespaces (`accent`, `primary`, `glass`, `elevation`, `semantic.*`).
- **FR-021**: Overrides MUST NOT break environment parity (invalid overrides block promotion).
- **FR-022**: System MUST maintain backward-compatible schema evolution (deprecated tokens flagged, not removed immediately).
- **FR-023**: System MUST gate user-extensible overrides behind a flexible permission model: `platformOwner` and `projectAdmin` may submit; an optional per-project `designDelegate` may be designated by a `platformOwner` for a specific project. All overrides >5% token impact or introducing new semantic namespaces require approval by either `platformOwner` or delegated approver; audit log captures submitter, approver, diff summary.
- **FR-024**: System MUST enforce sliding override size policy: first ≤5% of total tokens (count of distinct token keys changed) auto-applied; >5% and ≤10% requires manual approval; >10% rejected with structured error code `DESIGN_OVERRIDE_TOO_LARGE`. Percentage computed per full token count; color + spacing + typography counted equally. Policy extensible to category-based caps without breaking current logic.
- **FR-025**: System MUST rate limit override submissions: Standard projects ≤20 submissions per project per calendar day (UTC); Premium projects ≤40 per day (subject to possible future relaxation); bursts controlled by secondary limit of ≤5 submissions per rolling 1-hour window (both tiers). Exceeding limits returns error `DESIGN_OVERRIDE_RATE_LIMIT` with remaining quota metadata.

### Key Entities
- **DesignTokenSet**: Collection of atomic tokens (id, name, category, value, version, accessibilityMeta).
- **ThemeOverride**: Partial map of tokens referencing DesignTokenSet base; includes environment scope, app scope, author, createdAt.
- **ComponentVariant**: Structured description (componentName, variantName, tokensUsed[], accessibilityStatus).
- **TokenVersionSnapshot**: Immutable record for rollback (version, diffSummary, createdBy, createdAt).
- **AccessibilityAuditResult**: Contrast evaluations (pairId, ratio, status, recommendations).

## Success Criteria *(mandatory)*

### Measurable Outcomes
- **SC-001**: ≥ 95% of core components (Button, Card, Badge, Input, Modal) render identical semantic color meaning across web and mobile (validated by automated snapshot diff).
- **SC-002**: Token update propagation time (commit to both app builds ready) ≤ 5 minutes (95th percentile) in CI.
- **SC-003**: Accessibility contrast audit passes (AA) for ≥ 98% required text/background pairs on each build.
- **SC-004**: Override validation rejects 100% of malformed or circular references pre-merge (0 escaped to runtime).
- **SC-005**: ≥ 90% reduction in duplicated style literals across codebase within 2 weeks (tracked by lint rule before/after ratio).
- **SC-006**: Dark/light mode switch latency ≤ 150ms on mobile (95th percentile) and ≤ 100ms on web (95th).
- **SC-007**: Liquidglass fallback success (graceful degradation) ≥ 99% on devices lacking required capabilities.
- **SC-008**: Drift detector blocks 100% of merges where generated configs differ from spec tokens (no false negatives).
- **SC-009**: User-extensible overrides introduce ≤ 10% increase in bundle size (web) and ≤ 5% in JS payload (mobile).
- **SC-010**: Token version rollback completes ≤ 60s with full restoration of prior snapshot.

## Assumptions *(optional)*
- Liquidglass refers to a visual style combining translucency, blur, saturation with layered elevation—implemented via CSS filters (web) and RN blur/saturation modules (mobile); fallback = solid surface + subtle shadow.
- Permission roles exist (e.g., `platformOwner`, `projectAdmin`, `developer`); only highest roles can submit overrides.
- Contrast thresholds follow WCAG 2.1 AA (4.5:1 normal text, 3:1 large text).
- Color formats accepted: hex (#RRGGBB/#RRGGBBAA), OKLCH, HSL; unified serialization to OKLCH for internal contrast math.
- Build pipeline can inject token JSON at compile time (tree-shaken). 

## Non-Functional Constraints *(optional)*
- Security: No arbitrary CSS injection via overrides; whitelist token keys.
- Performance: Token resolution adds ≤ 2ms overhead per component render.
- Observability: All override applications log structured event without raw sensitive values.
- Idempotency: Re-applying same override produces identical snapshot hash.

## Risks *(optional)*
- Multiple token sources causing drift if spec enforcement lax.
- Liquidglass performance overhead on low-power devices.
- Accessibility regressions from user overrides.

## Out of Scope *(optional)*
- Dynamic user theme editing in real-time per end-user (future feature).
- Automatic design token extraction from Figma.

## Decisions (Resolved Clarifications)
1. Permission Model: `platformOwner`, `projectAdmin`, optional `designDelegate` (scoped). High-impact overrides need approver sign-off.
2. Override Size Policy: Sliding scale (≤5% auto, 5–10% approval, >10% reject).
3. Rate Limiting: Standard 20/day, Premium 40/day; both tiers ≤5/hour rolling window; future Premium relaxation allowed.

## Validation & Testing Strategy *(optional)*
Automated tests for token generation, contrast audits, override validation, drift detection, rollback. Snapshot diff tests compare rendered component semantics across platforms.

