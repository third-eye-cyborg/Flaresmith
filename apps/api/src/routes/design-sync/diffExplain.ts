// T094: RAG diff explanation placeholder endpoint
// Feature: 006-design-sync-integration
// Future: OpenAI embeddings for natural language drift explanations
// Spec References: FR-019 (RAG explanations)

import type { Hono } from 'hono';
import { designSyncLogger } from '../../lib/designSyncLogger';

export function registerDiffExplainRoutes(router: Hono) {
  /**
   * POST /diff-explain
   * Generate natural language explanation for design drift
   * TODO: Integrate with OpenAI embeddings service
   */
  router.post('/diff-explain', async (c) => {
    const startMs = Date.now();

    try {
      const { componentId, diffHash } = await c.req.json();

      designSyncLogger.info({
        action: 'diff.explain_requested',
        componentId,
        diffHash,
      });

      // Placeholder response
      const explanation = {
        componentId,
        diffHash,
        summary: 'Design drift detected in component spacing and color tokens.',
        details: [
          'Padding changed from 16px to 20px in primary button',
          'Background color shifted from #3b82f6 to #2563eb',
          'Border radius increased from 6px to 8px',
        ],
        confidence: 0.85,
        suggestedActions: [
          'Review design system token changes',
          'Update component snapshot',
          'Sync with design team',
        ],
        timestamp: new Date().toISOString(),
      };

      designSyncLogger.info({
        action: 'diff.explain_generated',
        componentId,
        confidence: explanation.confidence,
        durationMs: Date.now() - startMs,
      });

      return c.json(explanation, 200);
    } catch (error) {
      designSyncLogger.error({
        action: 'diff.explain_failed',
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startMs,
      });
      return c.json({ error: 'internal_server_error' }, 500);
    }
  });
}
