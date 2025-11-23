# Engineering Requirements Quality: Type Safety (Strict TS) & DI Env Injection

Purpose: Validate the quality of requirements around enabling strict TypeScript mode and completing environment injection (DI) across services, ensuring requirements are complete, clear, consistent, measurable, and cover scenarios/edge cases before implementation.

Created: 2025-11-22
Feature: 001-platform-bootstrap

## Requirement Completeness

- [ ] CHK001 Are explicit requirements stated to enable TypeScript strict mode in all relevant packages/apps, with a scoped list (e.g., apps/api, packages/*, apps/web, apps/mobile)? [Completeness, Tasks §T186, Plan §Technical Context]
- [ ] CHK002 Do the requirements enumerate which strict compiler options are mandatory (e.g., strict: true, noUncheckedIndexedAccess, noImplicitOverride, noImplicitReturns, exactOptionalPropertyTypes)? [Completeness, Clarity, Tasks §T186]
- [ ] CHK003 Are requirements defined for handling external integration response types (GitHub, Cloudflare, Neon, Postman) including safe narrowing patterns and validator usage (Zod) at module boundaries? [Completeness, Spec §FR-014, Plan §Technical Context]
- [ ] CHK004 Are requirements listed for removing any global/env shim usages and replacing them with DI via c.env (Cloudflare Workers) across all services that access env/config? [Completeness, Tasks §T187, Plan §Clarified Decisions]
- [ ] CHK005 Is the comprehensive list of affected modules/services for DI migration specified (e.g., PreviewService, ProjectService, previewMetricsUpdater, plus any others discovered by search)? [Completeness, Tasks §T187, [Gap]]
- [ ] CHK006 Are requirements defined for updating tests and test helpers to pass injected env/config (avoiding hidden globals)? [Completeness, Plan §Testing]
- [ ] CHK007 Is there a requirement to document a canonical DI pattern (function parameters vs factory, typed Env interface) and a lint rule or convention to prevent regressions? [Completeness, [Gap]]
- [ ] CHK008 Do requirements cover updating tsconfig base(s) in packages/config/tsconfig to align strictness across workspace? [Completeness, Plan §Project Structure]

## Requirement Clarity

- [ ] CHK009 Are vague terms like "fix remaining 95 TypeScript errors" replaced with quantifiable acceptance criteria (e.g., zero TS errors in apps/api with strict mode enabled; baseline error count pre/post)? [Clarity, Tasks §T186, [Ambiguity]]
- [ ] CHK010 Is the definition of "environment shim removal" unambiguous, including explicit prohibition of fallback helpers and the exact DI mechanism to use (c.env in Hono handlers, typed Env passed into services)? [Clarity, Tasks §T187, Plan §Clarified Decisions]
- [ ] CHK011 Are typed Env shapes defined (e.g., interface Env { DATABASE_URL: string; ... }) with required/optional keys and mapping to Cloudflare secret bindings names? [Clarity, Spec §Security & Secrets, Plan §Security & Rotation]
- [ ] CHK012 Are logging/telemetry requirements during the migration clearly specified (e.g., log deprecation warnings for shim usage until removed)? [Clarity, Spec §Observability & Telemetry]
- [ ] CHK013 Are rules for type assertions vs. refinements clarified (prefer Zod parse/ safeParse at boundaries; avoid as unknown as T)? [Clarity, Spec §FR-014, Plan §Technical Context]

## Requirement Consistency

- [ ] CHK014 Do strict mode/type safety requirements align with the spec-first principle (schemas in packages/types as the single source of truth) to avoid duplicated validation logic? [Consistency, Dev Guide, Spec §FR-009/FR-014]
- [ ] CHK015 Are DI requirements consistent with earlier route refactors (T180–T184) that already adopted c.env injection, ensuring no conflicting guidance remains? [Consistency, Tasks §T180–T184, Tasks §T187]
- [ ] CHK016 Do requirements for secrets/config access remain consistent with security rules (no secrets in logs, least privilege), avoiding any suggestion to log env values? [Consistency, Spec §FR-013, Security & Secrets]
- [ ] CHK017 Are testing requirements consistent across packages (Vitest primary, Jest only for RN compatibility), especially for DI-enabled modules? [Consistency, Plan §Testing]

## Acceptance Criteria Quality (Measurability)

- [ ] CHK018 Is there a measurable target: TypeScript compile across the workspace completes with zero errors under strict mode for targeted packages (list explicitly)? [Acceptance Criteria, Tasks §T186]
- [ ] CHK019 Are CI gates specified to enforce strict builds (e.g., pnpm typecheck fails PR if any TS errors; add job to .github/workflows/ci-lint.yml)? [Acceptance Criteria, Plan §Project Structure]
- [ ] CHK020 Is a measurable requirement defined that all API responses consumed from external services are validated at boundary with Zod and narrowed types are used internally (no any leakage), with coverage threshold or audit query? [Acceptance Criteria, Spec §FR-014, Tasks §T129]
- [ ] CHK021 Is there a measurable definition that no module imports or uses the deprecated env shim (e.g., codemod or grep passes; zero matches for envShim)? [Acceptance Criteria, Tasks §T187]
- [ ] CHK022 Is telemetry specified to record count of DI-injected service constructions and remaining shim calls during migration window (should be zero at completion)? [Acceptance Criteria, Spec §FR-035]

## Scenario Coverage

- [ ] CHK023 Do requirements include migration scenarios for services constructed outside Hono handlers (e.g., background jobs under scripts/, tests) where c.env is unavailable, specifying alternative injection patterns? [Coverage, Plan §Project Structure]
- [ ] CHK024 Are requirements defined for handling optional env variables vs required ones, including behavior when missing (startup failure vs runtime error envelope)? [Coverage, Spec §Error Model, Security & Secrets]
- [ ] CHK025 Are refactoring requirements defined for functions that read process.env (if any) to conform to Workers runtime constraints (no Node process.env at runtime)? [Coverage, [Gap]]
- [ ] CHK026 Are polyglot clients (apps/web, apps/mobile) excluded from strict TS changes where not applicable or explicitly included with scoped criteria? [Coverage, Boundary, Plan §Technical Context]

## Edge Case Coverage

- [ ] CHK027 Are requirements specified for mocking env in tests to avoid accidental leakage of real secrets (e.g., typed test Env fixtures, redaction in logs)? [Edge Case, Spec §Security & Secrets]
- [ ] CHK028 Is behavior defined when external API schemas evolve (backward-incompatible fields): do validators fail closed with actionable error codes and hints per Error Model? [Edge Case, Spec §Error Model, Tasks §T129]
- [ ] CHK029 Are requirements defined for partial DI adoption (mixed modules) during transition to prevent circular dependencies or inconsistent Env sources? [Edge Case, [Gap]]

## Non-Functional Requirements

- [ ] CHK030 Are performance implications of additional validations under strict mode (Zod parse) considered with measurable budgets (e.g., dashboard p95 < 500ms, rate limit overhead <5ms p95 unchanged)? [Non-Functional, Spec §SC-002, §SC-010]
- [ ] CHK031 Are logging and metrics for migration activities defined (counts of files/modules migrated, residual shim detections), with retention/aggregation guidance? [Non-Functional, Spec §FR-035]
- [ ] CHK032 Are developer experience requirements documented (codemods/lints/templates for DI pattern, tsconfig base references) to reduce friction? [Non-Functional, Plan §Project Structure, [Gap]]

## Dependencies & Assumptions

- [ ] CHK033 Are assumptions documented regarding Cloudflare bindings availability in all environments (dev/staging/prod) and CI (wrangler secrets) needed for typed Env? [Assumption, Spec §Environment Parity, Plan §Security & Rotation]
- [ ] CHK034 Are dependencies listed on prior refactors (T180–T184) and tests that must be updated before marking DI migration complete? [Dependency, Tasks §T180–T184, Tasks §T187]
- [ ] CHK035 Is there an assumption or dependency on updating packages/config/tsconfig base to propagate strictness consistently to consumers? [Dependency, Plan §Project Structure]

## Ambiguities & Conflicts

- [ ] CHK036 Is “strict mode scope” clearly scoped to apps/api initially (vs entire monorepo), or does it require simultaneous workspace‑wide adoption to avoid inconsistent behavior? Resolve any conflict between Tasks §T186 wording and Plan scope. [Ambiguity, Conflict, Tasks §T186, Plan §Technical Context]
- [ ] CHK037 Is the Env typing source of truth (Cloudflare bindings vs .env for local dev) clearly defined to avoid conflicting types across dev/prod? [Ambiguity, Plan §Security & Rotation, Spec §Security]
- [ ] CHK038 Do any spec sections recommend or imply global singletons for services that would conflict with DI requirements? If so, is the conflict called out and resolved? [Conflict, Plan §Project Structure, [Gap]]

---

Notes:
- Traceability anchors used: Tasks §T186/T187; Spec sections for FR‑014 (validation), FR‑013 (no secrets in logs), FR‑035 (telemetry), SC‑002/SC‑010; Plan sections for Technical Context, Testing, Clarified Decisions, Project Structure, Security & Rotation.
- This checklist tests requirement quality, not implementation. Use it to refine the written requirements before coding.
