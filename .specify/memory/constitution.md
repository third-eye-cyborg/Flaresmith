<!--
Sync Impact Report
Version: (none) → 0.1.0
Modified Principles: (initial creation)
Added Sections: Additional Constraints & Non-Functional Requirements; Development Workflow & Quality Gates
Removed Sections: None
Templates Reviewed: plan-template.md ✅ (updated), spec-template.md ✅ (no change needed), tasks-template.md ✅ (no change needed)
Deferred TODOs: None
-->

# CloudMake Constitution

## Core Principles

### I. Spec-First Orchestration (NON-NEGOTIABLE)
Every material change MUST originate from an approved spec under `/specs`. Code, database schemas, MCP tool descriptors, Postman collections, and CI workflows MUST trace back to a spec artifact. No feature may be merged if corresponding spec sections are missing or stale. AI agents MUST ingest spec context before proposing code edits. Divergence between spec and implementation MUST be resolved before merge (either update spec or reject change).

### II. Environment Parity & Idempotent Automation
The canonical environments are `dev`, `staging`, and `prod` and MUST remain structurally consistent across GitHub (branches + environments), Cloudflare (Workers/Pages + DNS), Neon (DB branches), and Postman (environments). All orchestration actions (create repo, provision DB branch, deploy Worker, sync collection) MUST be idempotent: repeating them yields no destructive side‑effects and converges to the same state. Promotion flows (dev→staging→prod) MUST be explicit, logged, and reversible where supported.

### III. Tool-/MCP-Centric AI Workflow
MCP server tool descriptors under `/mcp/servers/**` are the authoritative contract for AI automation. Agents (Copilot CLI, Spaces, internal chat) MUST prefer invoking existing tools over editing raw files directly. Each tool MUST declare name, description, input schema, output schema, and at least one example invocation. Adding or modifying orchestration capabilities MUST include corresponding MCP descriptors and spec updates. Silent or undocumented tooling changes are prohibited.

### IV. Security, Observability & Audit
Secrets and credentials (GitHub App tokens, Cloudflare API tokens, Neon keys, Postman API keys) MUST use least privilege and NEVER be committed to source. All backend orchestration operations MUST emit structured, correlation‑ID tagged logs. Critical actions (provision, deploy, promote, rollback) MUST be audit‑logged with actor, inputs, and outcome. Monitoring MUST surface build, test, and deploy status per environment. Failed security or compliance checks MUST block merges until resolved.

### V. Monorepo Simplicity & Reusable Primitives
The Turborepo + pnpm monorepo MUST minimize duplication: shared logic lives in `packages/{ui,types,api-client,utils,config}`. New packages require an explicit justification recorded in the plan complexity table. Shared Zod schemas in `packages/types` are the single source of truth for validation used by API routes, DB schema generation, Postman collections, and UI forms. Code generation outputs MUST be human‑maintainable (formatted, lint‑clean, documented) and MUST not introduce opaque meta frameworks. Prefer incremental evolution over large rewrites.

## Additional Constraints & Non-Functional Requirements

1. Tech Stack: Next.js 14+, Expo (Router + NativeWind), Hono (Cloudflare Workers runtime) + Drizzle + Neon, Cloudflare Workers/Pages, Postman, Spec Kit, MCP 2.0 directory. (Updated: Express replaced by Hono per Feature 001 decision; aligns with edge-native deployment and removes adapter complexity.)
2. Performance: API p95 < 300ms for standard orchestration calls; UI interactive < 3s first load; background sync tasks MUST be queueable and resumable.
3. Reliability: Orchestration operations MUST be idempotent and retriable; partial failures MUST surface actionable remediation steps.
4. Security: No credential logging; all secrets loaded via environment injection (Codespaces, GitHub Environments, Cloudflare bindings). Mandatory dependency scanning in CI.
5. Observability: Structured JSON logs + optional human line logs; environment dashboard MUST display last build, last deploy, health, and promotion lineage.
6. Versioning: Monorepo packages follow semver; breaking schema changes MUST include migration steps and spec diff.
7. Dogfooding: Platform MUST run on its own template; improvements to template propagate to future project scaffolds automatically.

## Development Workflow & Quality Gates

1. Initiation: Every feature begins with a spec (`/specs/feature/`) including user stories, requirements, and success criteria.
2. Planning: `/speckit.plan` produces plan.md referencing Constitution gates; complexity table required for structural deviations.
3. Tasks: `/speckit.tasks` produces tasks.md grouped by user story enabling independent delivery + testability.
4. Implementation Order: Foundations (shared packages + env wiring) → P1 story (MVP) → subsequent stories in priority order or parallel (ensuring independence).
5. Testing: Contract + integration tests MUST precede implementation for critical orchestration endpoints; generated schemas MUST have validation tests.
6. Review: PR reviewers MUST verify (a) spec alignment, (b) MCP tool updates, (c) environment parity unchanged or properly justified, (d) security audit (no secret leaks), (e) observability instrumentation presence.
7. Promotion: Merges into `staging` and `main` MUST include green CI (lint, typecheck, tests, Postman collection run). Rollback strategy MUST be documented for each deployable component.
8. Automation: CI enforces Constitution via scripts (spec freshness check, MCP descriptor lint, environment matrix validation).
9. AI Agent Guardrails: Chat wrapper injects spec + MCP context; agents MUST not bypass required review gates; auto‑commits MUST include spec reference in commit message.

## Governance

1. Authority: This Constitution supersedes conflicting docs. Specs are authoritative for feature scope; Constitution is authoritative for process and non‑functional standards.
2. Amendment Process: Proposal (PR modifying this file) → Impact Report header updated → Review by at least 2 maintainers or one security + one architecture approver → Merge triggers version bump per rules below.
3. Versioning Rules:
	- MAJOR: Remove or redefine a core principle, alter environment model, or introduce incompatible workflow.
	- MINOR: Add a new principle, extend governance sections materially, add required gates.
	- PATCH: Wording clarifications, refinements, minor non‑semantic edits.
4. Compliance Review: Weekly automated job posts a summary of violations (unused specs, stale MCP tools, missing logs). Unresolved P1 violations after 7 days escalate to security review.
5. Exceptions: Temporary exceptions require an approved complexity table entry in plan.md and MUST include sunset date.
6. Traceability: All merges touching orchestration, spec, or MCP descriptors MUST include spec file references and (if applicable) Postman collection IDs.
7. Archival: Superseded versions retained in Git history; no manual deletion. External consumers may pin a Constitution version; breaking changes require migration docs in `/specs/migrations/`.

**Version**: 0.1.0 | **Ratified**: 2025-11-21 | **Last Amended**: 2025-11-21

