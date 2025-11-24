# Copilot Agent Context Extension: Design Sync & Integration Hub

## Added Domains
- Design-Code Synchronization (diff preview, direction modes)
- Drift Detection & Reporting (canonical hash comparison)
- Undo/Redo History (24h window, 50 cap)
- Notification Categories (configurable event set)
- Credential Governance (status validation, rotation)
- Coverage Reporting (variant/test completeness)
- Browser Test Sessions (Chrome MCP integration)

## Key Schemas (Zod planned in `packages/types/src/design-sync`)
- SyncOperationInput
- DriftQuery
- UndoRequest
- CoverageQuery
- CredentialAction
- BrowserSessionStart

## MCP Tools (to be added)
| Name | Purpose | Input Schema | Output Schema |
|------|---------|--------------|---------------|
| design.sync | Execute sync | SyncOperationInput | SyncResult |
| design.driftReport | Fetch drift | DriftQuery | DriftSummary |
| design.undo | Undo sync | UndoRequest | UndoResult |
| design.coverageReport | Coverage | CoverageQuery | CoverageReport |
| design.browserTest.start | Start browser session | BrowserSessionStart | BrowserSessionStatus |
| design.browserTest.status | Get session status | SessionIdInput | BrowserSessionStatus |

## Logging Requirements
Each action: correlationId, actor, componentCount, durationMs, result status.

## Security Constraints
No secret values logged; credential actions restricted by role matrix.

## Performance Targets
- Sync diff build ≤ 2s (≤50 components)
- Coverage generation ≤5s (≤200 components)

## Implementation Notes
Prefer incremental approach: service layer wrappers around DB + external integration; avoid duplication of schema definitions (single source: packages/types).

---
*End of agent-copilot context extension*
