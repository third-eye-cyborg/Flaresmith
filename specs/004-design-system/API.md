# Design System API Documentation (Feature 004)

Version: 0.1.0  
Source Spec: `specs/004-design-system/spec.md`  
Merge Order: base → semantic → mode → override → preview

## Overview
Endpoints provide token retrieval, component variant metadata, override workflow operations, accessibility auditing, drift detection, and rollback.
All responses wrap data in domain envelopes; errors follow `apps/api/src/types/errors.ts` taxonomy.

## Authentication
All endpoints require a valid JWT (see platform auth spec). Include header:
```
Authorization: Bearer <access_token>
```

## Correlation IDs
Include an `X-Correlation-Id` header for traceability. If omitted, the service generates one.

---
## 1. Tokens
### GET /design/tokens
Retrieve tokens (optionally filter by category/version).

Query Params:
- `category` (optional): color | spacing | typography | radius | elevation | glass | semantic
- `version` (optional): integer version

Response:
```json
{
  "version": 12,
  "tokens": [
    { "name": "primary.blue.500", "category": "color", "value": "#3b82f6" },
    { "name": "spacing.4", "category": "spacing", "value": "16px" }
  ]
}
```

### Performance Metrics (T107)
Token retrieval emits audit events:
```json
{
  "event": "design.tokens.retrieved",
  "version": 12,
  "count": 132,
  "durationMs": 84,
  "cache": false
}
```
A cached response sets `cache: true`.

---
## 2. Component Variants
### GET /design/components/variants
List registered component variants.

Response:
```json
{
  "variants": [
    { "component": "card", "variant": "glass", "tokens_used": ["glass.blur.md", "elevation.lg"], "accessibility_status": "pass" }
  ]
}
```

---
## 3. Overrides
### POST /design/overrides
Submit override diff.

Body:
```json
{
  "environment": "staging",
  "diff": [
    { "name": "accent.purple.500", "newValue": "#8b5cf6" }
  ]
}
```

Response:
```json
{
  "overrideId": "cfe0...",
  "status": "auto-applied",
  "size_pct": 2.4,
  "requires_approval": false
}
```

### PATCH /design/overrides/:id/approve
Approve pending override.

### GET /design/overrides/:id
Retrieve status & diff summary.

---
## 4. Accessibility Audits
### POST /design/audits/run
Trigger audit (mode optional, default light).

Body:
```json
{ "mode": "dark" }
```
Response:
```json
{ "auditId": "9c2e...", "status": "started" }
```
Completion event:
```json
{
  "event": "design.accessibility.audit.completed",
  "auditId": "9c2e...",
  "version": 12,
  "mode": "dark",
  "passed_pct": 98,
  "total_pairs": 240,
  "durationMs": 1438
}
```

### GET /design/audits/latest?mode=dark
Latest audit report.

Response (truncated):
```json
{
  "version": 12,
  "mode": "dark",
  "passedPct": 98,
  "report": [
    { "fgToken": "semantic.text.primary", "bgToken": "semantic.surface.primary", "ratio": 7.2, "status": "pass" }
  ]
}
```

---
## 5. Drift Detection
### GET /design/drift
Compares current tokens against baseline snapshot.

Response:
```json
{
  "baselineVersion": 11,
  "currentVersion": 12,
  "hasDrift": true,
  "diff": {
    "color": { "modified": ["primary.blue.500"], "added": [], "removed": [] }
  }
}
```

CI MUST block merges if `hasDrift=true` (SC-008).

---
## 6. Rollback
### POST /design/rollback
Rollback to prior version.

Body:
```json
{ "targetVersion": 11, "rationale": "Revert broken contrast" }
```
Response:
```json
{ "previousVersion": 12, "newVersion": 13, "hash": "a91e...", "durationMs": 824 }
```

SC-010 target: `durationMs <= 60000`.

---
## 7. Metrics & Performance
(Internal) Performance snapshot available via future metrics endpoint:
```json
{
  "tokenService": { "calls": 42, "cacheHits": 20, "avgDurationMs": 65.4, "cacheHitRatePct": 48 },
  "audit": { "lastDurationMs": 1438 }
}
```

---
## 8. Error Responses
Unified format:
```json
{
  "error": {
    "code": "DESIGN_DRIFT_DETECTED",
    "message": "Token drift detected between baseline and current version.",
    "severity": "warning",
    "retryPolicy": "manual",
    "hint": "Review drift report and update baseline or resolve divergence before merging.",
    "timestamp": "2025-11-23T10:41:33Z"
  }
}
```

Refer to `apps/api/src/types/errors.ts` for full taxonomy.

---
## 9. Preview Tokens (FR-019)
When `DESIGN_PREVIEW=true` is set during generation, preview tokens are merged last:
```json
{
  "event": "design.tokens.retrieved",
  "previewLayer": true,
  "count": 138
}
```
Preview tokens never persist in `design_token_versions`.

---
## 10. Mode Switching (FR-017)
Web: `next-themes` selects dark/light; Mobile: custom context provider. Token generation currently outputs light-mode merged set; future enhancement may produce dual exports.

---
## Pagination & Limits
Current endpoints return full sets (≤ few hundred tokens). Future pagination will adopt cursor-based pattern.

---
## Idempotency
Override submissions and rollbacks are idempotent with hash-based convergence.

---
## Versioning
Each token change creates a snapshot (immutable). Rollback creates a new version pointing to previous snapshot.

---
## Glossary
- **Semantic Token**: High-level intent (e.g., semantic.text.primary) referencing base tokens.
- **Override**: User-provided subset of token values applied post merge.
- **Drift**: Divergence between baseline snapshot and current active tokens.
- **Preview Layer**: Experimental tokens enabled only via env var.

---
## Change Log
- 2025-11-23: Initial draft (T106)
