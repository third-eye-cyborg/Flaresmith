/**
 * Feature flags for Design Sync & Integration Hub.
 * Spec Reference: specs/006-design-sync-integration/spec.md
 */

// Design Sync core enablement (manual sync, drift, undo, coverage scaffolds)
export const DESIGN_SYNC_ENABLED = process.env.DESIGN_SYNC_ENABLED === 'true';

// Reserved for optional RAG diff explanation (added in later phase)
export const DESIGN_SYNC_RAG_EXPLAIN = process.env.DESIGN_SYNC_RAG_EXPLAIN === 'true';

// Helper to assert required flag state where critical
export function requireDesignSyncEnabled() {
  if (!DESIGN_SYNC_ENABLED) {
    throw new Error('Design Sync feature disabled (DESIGN_SYNC_ENABLED=false)');
  }
}

// Snapshot for diagnostics
export const designSyncFlagSnapshot = {
  DESIGN_SYNC_ENABLED,
  DESIGN_SYNC_RAG_EXPLAIN,
};
