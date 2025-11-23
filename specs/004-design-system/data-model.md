# Data Model: Unified Cross-Platform Design System

**Feature**: `004-design-system`  
**Date**: 2025-11-23

## Overview
Entities implement Key Entities + workflow state for overrides, versions, audits, drift. All IDs UUID v4, timestamps UTC.

## Entities

### DesignToken
Represents an atomic design value.
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | text | unique; namespace pattern `category.name.scale` e.g. `primary.blue.500` |
| category | text | enum: color|spacing|typography|radius|elevation|glass|semantic |
| value | jsonb | raw value (color string, number, object for typography) |
| accessibility_meta | jsonb | precomputed luminance, contrast pairs cached |
| version | int | current active version reference |
| created_at | timestamptz | creation timestamp |
| updated_at | timestamptz | last modification |

### DesignTokenVersionSnapshot
Immutable snapshot for rollback.
| Field | Type | Notes |
| id | uuid | PK |
| version | int | monotonically increasing |
| snapshot | jsonb | array/object of tokens normalized (sorted) |
| hash | text | SHA-256 of normalized snapshot |
| created_by | uuid | user id |
| created_at | timestamptz | timestamp |

### ThemeOverride
User-submitted override (environment + project scope).
| Field | Type | Notes |
| id | uuid | PK |
| project_id | uuid | project reference |
| environment | text | dev|staging|prod |
| submitted_by | uuid | actor |
| status | text | submitted|auto-applied|pending-approval|approved|rejected |
| size_pct | int | percent of tokens changed (calc) |
| requires_approval | boolean | derived from size pct & new namespaces |
| token_diff | jsonb | map of tokenName -> { oldValue, newValue } |
| approved_by | uuid nullable | approver id |
| created_at | timestamptz | timestamp |
| updated_at | timestamptz | timestamp |

### ComponentVariant
Defines component variant metadata.
| Field | Type | Notes |
| id | uuid | PK |
| component | text | e.g. Button, Card |
| variant | text | e.g. primary, glass, elevated |
| tokens_used | jsonb | array of token names |
| accessibility_status | text | pass|warn|fail |
| created_at | timestamptz | timestamp |

### AccessibilityAuditResult
Accessibility contrast audit run.
| Field | Type | Notes |
| id | uuid | PK |
| version | int | token version audited |
| mode | text | light|dark |
| report | jsonb | array of { fgToken, bgToken, ratio, status } |
| passed_pct | int | percent passing AA |
| created_at | timestamptz | timestamp |

### DesignDriftEvent
Drift between spec tokens & generated config.
| Field | Type | Notes |
| id | uuid | PK |
| baseline_version | int | version considered baseline |
| current_hash | text | hash of current active tokens |
| diff | jsonb | { category: { added:[], removed:[], changed:[{name, old, current}] } } |
| created_at | timestamptz | timestamp |

## Relationships
- `DesignToken.version` → `DesignTokenVersionSnapshot.version`
- Overrides applied generate new snapshot → new version entry
- Drift events reference baseline snapshot version
- Accessibility audits reference version

## State Machines
### ThemeOverride Status
submitted → (auto size_pct<=5%) auto-applied
submitted → (requiresApproval) pending-approval → approved → auto-applied
pending-approval → rejected (terminal)
auto-applied → (superseded by new override) archived (implicit via version change)

### Rollback Flow
current(active) → rollback(request) → applying(transaction) → active(new version) | error(failed) → retry

## Indexing Strategy
- `design_tokens(name)` unique index
- `design_token_versions(hash)` unique index
- `theme_overrides(project_id, environment, status)` partial indexes for active/pending
- `accessibility_audits(version, mode)` composite index
- `design_drift_events(baseline_version)` index for latest drift lookup

## Validation Rules (Zod Schema Plan)
- Token name regex: `^(primary|accent|semantic|glass|elevation|spacing|radius|typography)\.[a-z0-9-]+\.[0-9]{2,3}$` for scaled tokens; exceptions for semantic tokens `semantic\.(error|warning|success|info)$`.
- Color value support: hex (#RRGGBB/#RRGGBBAA), OKLCH (`oklch(l c h)`), HSL.
- Override size check: size_pct <= 10 else reject.
- Circular reference detection: DFS across token_diff referencing pattern `${token.ref}`.
- Contrast ratio: fail if < 4.5 (normal text), <3.0 (large text) unless semantic override flagged `warn`.

## Serialization & Hashing
Normalization pipeline:
1. Sort tokens by category then name.
2. Strip volatile fields (created_at, updated_at).
3. JSON stringify stable ordering.
4. SHA-256 hash.

## Drift Detection Algorithm
1. Load baseline snapshot (latest version where drift diff empty).
2. Normalize current tokens; hash.
3. Compare baseline hash vs current; if equal → no drift.
4. Compute per-category diff sets; persist `DesignDriftEvent` if non-empty.

## Security & Redaction
- No storage of raw secret-like values; color strings safe. Sensitive future tokens (if any) flagged and redacted in logs using pattern list.

## Audit & Logging Events
- `design.override.submitted`
- `design.override.applied`
- `design.override.rejected`
- `design.tokens.version.created`
- `design.tokens.rollback.completed`
- `design.drift.detected`
- `design.accessibility.audit.completed`

## MCP Schema References (planned)
Schemas will export JSON for:
- `GetTokensResponse`
- `ApplyOverrideRequest` / `ApplyOverrideResponse`
- `AccessibilityAuditReport`
- `RollbackRequest` / `RollbackResponse`
- `DetectDriftResponse`

## Open Design Considerations
- Potential future category for motion tokens (animations) not in initial scope.
- Multi-theme layering beyond dark/light (e.g., high-contrast mode) to integrate after baseline.

## Rationale Alignment
All entities directly map to spec Key Entities; state transitions implement FR-023/024 governance and SC-010 rollback timing objective.
