// T082: Browser session start route (POST)
// Feature: 006-design-sync-integration
// Start MCP browser test session linked to Storybook story
// Spec References: FR-018, US5

import type { Hono } from 'hono';
import { z } from 'zod';
import { browserTestService } from '../../services/browserTestService';
import { designSyncLogger } from '../../lib/designSyncLogger';

const BrowserSessionStartSchema = z.object({
  storyId: z.string().uuid(),
  correlationId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export function registerBrowserSessionStartRoutes(router: Hono) {
  /**
   * POST /browser-sessions
   * Start a new browser test session
   */
  router.post('/browser-sessions', async (c) => {
    const startMs = Date.now();

    try {
      // Parse request body
      const bodyResult = BrowserSessionStartSchema.safeParse(await c.req.json());

      if (!bodyResult.success) {
        designSyncLogger.info({
          action: 'browser.session_start_validation_failed',
          errors: bodyResult.error.errors,
        });
        return c.json({ error: 'invalid_payload', details: bodyResult.error.errors }, 400);
      }

      const { storyId, correlationId, metadata } = bodyResult.data;

      // Start session via service
      const session = await browserTestService.startSession({
        storyId,
        correlationId: correlationId || crypto.randomUUID(),
        ...(metadata && { metadata }),
      });

      designSyncLogger.info({
        action: 'browser.session_start_completed',
        sessionId: session.sessionId,
        storyId: session.storyId,
        durationMs: Date.now() - startMs,
      });

      return c.json(session, 201);
    } catch (error) {
      designSyncLogger.error({
        action: 'browser.session_start_failed',
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startMs,
      });
      return c.json({ error: 'internal_server_error' }, 500);
    }
  });
}
