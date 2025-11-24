# Research: Design Sync & Integration Hub

## Decision Log Format
Each entry lists Decision, Rationale, Alternatives Considered, and Impact.

### 1. Undo History Model
- **Decision**: Time-window (24h) with cap of 50 sync operations.
- **Rationale**: Balances operational safety with predictable storage; supports daily workflows without indefinite growth.
- **Alternatives Considered**: Fixed depth=10 (insufficient for batch workflows); depth=25 (still potentially low for active teams); unlimited (risk of unbounded storage + complexity).
- **Impact**: Requires pruning job and expiration logic; simplifies UI (show remaining slots/time window).

### 2. Notification Event Categories
- **Decision**: Expanded set (sync completed, drift detected, test coverage summary, nightly digest, credential status changes, browser test failures) with per-project enable/disable.
- **Rationale**: Provides comprehensive visibility while allowing teams to mute low-value categories.
- **Alternatives Considered**: Core-only (less noise but reduced proactive insights); full-spectrum (adds undo/redo & schedule start events; higher spam risk).
- **Impact**: Needs preference storage model and category registry; digest job aggregates disabled categories only if enabled.

### 3. Role Matrix Enforcement
- **Decision**: Admin & Maintainer: all actions; Developer: manual sync only; Viewer: read-only.
- **Rationale**: Prevents unauthorized credential rotation/undo; allows developers to contribute syncs.
- **Alternatives Considered**: Developer undo allowed (increased risk of unintended reversals); Maintainer rotation restricted (adds friction for ops).
- **Impact**: Access control checks in each route; audit logging includes attempted unauthorized actions.

### 4. Diff Hashing Strategy
- **Decision**: Canonical JSON representation (sorted keys, normalized variant order) hashed (SHA-256) for pre/post states and drift detection.
- **Rationale**: Deterministic, lightweight, easy to compare; avoids deep structural diff complexity.
- **Alternatives Considered**: AST-level diff (higher precision but heavy); line-by-line textual diff (fragile across formatting changes).
- **Impact**: Need canonicalizer utility; ensures idempotent detection and undo reliability.

### 5. Atomic Per-Component Sync Apply
- **Decision**: Apply changes component-by-component within a transaction boundary; partial failures isolate affected components.
- **Rationale**: Minimizes blast radius; improves reliability with large batches.
- **Alternatives Considered**: Whole-batch atomic (rollback entire batch—less efficient); streaming without transaction (risk of inconsistent states).
- **Impact**: Multi-component sync loops over components with try/catch; collects status array.

### 6. Drift False Positive Reduction
- **Decision**: Pre-filter changes ignoring timestamp-only and formatting-only modifications using canonicalization.
- **Rationale**: Ensures trust in drift reports; meets SC-006.
- **Alternatives Considered**: Raw diff (higher false positives); heuristic machine learning (higher complexity for initial release).
- **Impact**: Simple heuristic rules; metrics collected to adjust thresholds later.

### 7. Coverage Report Caching
- **Decision**: Cache last coverage computation per component; invalidate on sync or variant/story modification.
- **Rationale**: Reduces repeated heavy calculations; improves dashboard responsiveness.
- **Alternatives Considered**: No cache (higher latency); persistent daily snapshot only (less real-time insight).
- **Impact**: Additional cache table or in-memory ephemeral store.

### 8. Notification Dispatch Reliability
- **Decision**: Retry with exponential backoff (base 500ms, multiplier 2, max 3 attempts) then log failure metric.
- **Rationale**: Ensures high delivery success (SC-004) without indefinite retries.
- **Alternatives Considered**: No retries (lower reliability); unlimited retries (resource usage risk).
- **Impact**: Simple retry helper used by categories dispatcher.

### 9. Credential Validation Strategy
- **Decision**: Pre-flight synchronous validation (ping provider or verify token format) before sync; failure aborts operation.
- **Rationale**: Prevent wasted sync attempts; ensures SC-008.
- **Alternatives Considered**: Post-failure detection (slower feedback); background validation only (race conditions).
- **Impact**: Adds small latency overhead but improved robustness.

### 10. Browser MCP Session Association
- **Decision**: Store mapping between test session id and story id; embed correlationId for cross-log tracing.
- **Rationale**: Maintains integrity for SC-010; enables quick debugging of test outcomes in relation to design sync state.
- **Alternatives Considered**: Loose coupling via naming conventions (fragile); direct embedding in story metadata only (less flexible).
- **Impact**: Additional foreign key or reference field; ensures reliable linking.

## Summary of Alternatives Rejected
| Area | Alternative | Reason Rejected |
|------|-------------|-----------------|
| Undo Depth | Fixed small (10) | Insufficient historical context |
| Notifications | Core-only | Reduced visibility of failures |
| Diff Method | AST-based | Overkill initial phase; complexity |
| Sync Scope | Whole-batch atomic | Poor partial failure resilience |
| Drift Analysis | Raw diff | Higher false positives |
| Coverage Strategy | No cache | Lower performance |
| Retry Policy | Unlimited | Resource risk |
| Credential Validation | Post-failure only | Delayed feedback |
| Browser Association | Name-based | Fragile mapping |

## Pending Future Enhancements (Not Phase 1)
- ML-assisted drift classification.
- Historical coverage trend visualization.
- Adaptive notification throttling.
- RAG diff explanation integration.

---
*End of research.md*
