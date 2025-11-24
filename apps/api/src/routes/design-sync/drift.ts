// T046: GET /design-sync/drift route handler
// Feature: 006-design-sync-integration
// Provides drift summary. Placeholder sources built from component artifacts (stub fields).
// Spec References: FR-004, FR-017, SC-006

import { Hono } from 'hono';
import { db } from '../../db/connection';
import { componentArtifacts } from '../../db/schema/designSync';
import { detectDrift, DriftSource } from '../../utils/designSync/driftDetect';
import { designSyncLogger } from '../../logging/designSyncLogger';

export function registerDriftRoutes(router: Hono) {
  router.get('/drift', async (c) => {
    try {
      const components = await db.select().from(componentArtifacts); // In real impl filter mapped components only
      const sources: DriftSource[] = components.map(ca => ({
        componentId: ca.id,
        code: { variantCount: Array.isArray(ca.variants) ? ca.variants.length : 0 },
        design: { variantCount: Array.isArray(ca.variants) ? ca.variants.length : 0 }, // Placeholder identical => no drift
      }));
      const drift = detectDrift(sources);
      designSyncLogger.info({ action: 'drift.get', total: drift.total, heuristicsFiltered: drift.falsePositiveHeuristicsApplied });
      return c.json({ hasDrift: drift.total > 0, totalComponents: components.length, components: drift.items, falsePositiveHeuristicsApplied: drift.falsePositiveHeuristicsApplied });
    } catch (err: any) {
      designSyncLogger.error({ action: 'drift.error', message: err?.message });
      return c.json({ error: 'drift_failed', message: 'Unable to compute drift.' }, 500);
    }
  });
}
