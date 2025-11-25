# Feature Specification: Marketing Site Polish & Conversion Optimization

**Feature ID**: 007-marketing-polish  
**Branch Prefix**: `feature/marketing-polish`  
**Created**: 2025-11-25  
**Status**: Draft  
**Depends On**: 001-platform-bootstrap (base architecture), 004-design-system (tokens & theming)

## Problem Statement
Current marketing-facing pages (`/`, `/features`, `/pricing`) provide information but lack refined visual hierarchy, conversion-focused components, motion design, and consistent accessibility semantics. This reduces perceived product quality and likely lowers visitor → trial conversion.

## Goals
1. Elevate visual design to match edge-native orchestration positioning ("spec-first precision" + "flame/forge" brand metaphor).
2. Improve initial above-the-fold clarity: single-line value prop + supporting subheading + immediate primary CTA.
3. Increase scannability with consistent section rhythm (≈ 120–160px vertical spacing, container width 7xl, content width clamps).
4. Introduce lightweight, GPU-friendly ambient motion (gradient aurora + subtle parallax) without harming Core Web Vitals.
5. Ensure WCAG 2.1 AA contrast (≥4.5) for body text and interactive components in both light & dark modes.
6. Provide reusable marketing primitives (HeroSection, FeatureGrid, TestimonialSection, CTASection, GradientBackground) for future pages.

## Functional Requirements
- FR-MP-001: Replace ad‑hoc radial backgrounds with composable `<GradientBackground variant="aurora|mesh|radial" />` supporting layering & dark mode adaptation.
- FR-MP-002: Implement `<HeroSection>` consuming props `{ eyebrow?: string; title: string; subtitle?: string; primaryCta: CTA; secondaryCta?: CTA; metrics?: Metric[] }`.
- FR-MP-003: Feature grid MUST use existing `FeatureCard` component but support animation on viewport entry (fade + slight rise). CPU budget ≤ 1% average.
- FR-MP-004: Pricing cards MUST emphasize middle (Growth) tier using scale + outline gradient ring while remaining accessible (no color-only distinction).
- FR-MP-005: Introduce new button variants `soft`, `outlineGradient`, `glassElevated` aligned with design system tokens.
- FR-MP-006: All marketing headings MUST follow semantic order (H1 once per page; subsections H2; card titles use semantic H3 within section).
- FR-MP-007: Page MUST expose landmark regions: `<header>`, `<main>`, `<footer>`; CTA area wrapped in `<section aria-labelledby="cta-heading">`.
- FR-MP-008: Animations MUST respect reduced-motion: disable non-essential transforms if `prefers-reduced-motion: reduce`.
- FR-MP-009: Components MUST avoid layout shift (CLS < 0.01) by reserving space for decorative elements.
- FR-MP-010: All interactive elements MUST have a visible focus state distinct from hover.

## Non-Functional & Success Criteria
- SC-MP-001: Largest Contentful Paint (LCP) on homepage ≤ 2.5s (simulated mid-tier hardware, cold cache).
- SC-MP-002: Total blocking time added by new animations ≤ 50ms.
- SC-MP-003: Lighthouse Accessibility score ≥ 98 for updated pages.
- SC-MP-004: Bundle delta for new marketing components ≤ +15KB gzip.
- SC-MP-005: No console errors/warnings introduced.
- SC-MP-006: Reusable primitives exported for future spec-driven pages (extension friendly).

## Out of Scope
- Full internationalization (placeholder architecture only).
- A/B experimentation framework (future integration).
- Analytics event wiring (will integrate PostHog spec subsequently).

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Excessive animation hurting performance | LCP & CPU | Use pure CSS keyframes & `will-change: transform` only on small elements; disable on reduce-motion. |
| Visual drift vs design system tokens | Inconsistency | Reuse CSS custom properties; avoid hard-coded colors; define gradients via token pairs. |
| Accessibility regressions | Usability/legal | Automated lint checks + manual contrast verification; semantic heading audit. |

## Implementation Plan (High-Level)
1. Extend Tailwind config with keyframes: aurora, float, shimmer, pulse-glow and add utilities (`bg-aurora`, gradient masks).
2. Create marketing primitives under `apps/web/src/components/marketing/`.
3. Refactor pages to compose primitives.
4. Update button variants and export new styles.
5. Accessibility + reduced motion pass.
6. Run lint, typecheck, manual local Lighthouse.

## Tracking & Telemetry
Add optional `data-analytics-id` attributes to CTA buttons (`hero-primary-cta`, `hero-secondary-cta`, `pricing-tier-select-<tier>`).

## Acceptance Tests (Manual / Automated Placeholder)
- AT-Home-001: Homepage renders HeroSection with primary CTA visible above the fold.
- AT-Home-002: Aurora background animates (unless reduce-motion).
- AT-Features-001: Each FeatureCard enters viewport with subtle rise animation.
- AT-Pricing-001: Growth tier visually emphasized (gradient border + scale) without relying solely on color.
- AT-Accessible-001: Tab navigation cycles through CTAs with visible focus ring.

---
**Spec Author**: AI Agent (GitHub Copilot)  
**Reviewers**: TBD  
**Next Step**: Implement primitives & refactors per plan.
