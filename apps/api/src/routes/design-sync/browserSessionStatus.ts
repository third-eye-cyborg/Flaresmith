// T083: Browser session status route (GET)
// Feature: 006-design-sync-integration
// Query browser test session status with performance metrics
// Spec References: FR-018, US5

import type { Hono } from 'hono';
import { browserTestService } from '../../services/browserTestService';
import { designSyncLogger } from '../../lib/designSyncLogger';

export function registerBrowserSessionStatusRoutes(router: Hono) {
  /**
   * GET /browser-sessions/:sessionId
   * Get browser test session status and performance metrics
   */
  router.get('/browser-sessions/:sessionId', async (c) => {
    const startMs = Date.now();
    const { sessionId } = c.req.param();

    try {
      // Query session status
      const session = await browserTestService.getSessionStatus(sessionId);

      if (!session) {
        designSyncLogger.info({
          action: 'browser.session_status_not_found',
          sessionId,
        });
        return c.json({ error: 'session_not_found' }, 404);
      }

      designSyncLogger.info({
        action: 'browser.session_status_retrieved',
        sessionId,
        sessionStatus: session.status,
        durationMs: Date.now() - startMs,
      });

      return c.json(session, 200);
    } catch (error) {
      designSyncLogger.error({
        action: 'browser.session_status_failed',
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startMs,
      });
      return c.json({ error: 'internal_server_error' }, 500);
    }
  });

  /**
   * PATCH /browser-sessions/:sessionId
   * Update browser test session status and performance metrics
   */
  router.patch('/browser-sessions/:sessionId', async (c) => {
    const startMs = Date.now();
    const { sessionId } = c.req.param();

    try {
      const body = await c.req.json();
      const { status, performanceSummary } = body;

      // Validate status if provided
      const validStatuses = ['running', 'passed', 'failed', 'aborted'] as const;
      if (status && !validStatuses.includes(status)) {
        return c.json({ error: 'invalid_status', allowed: validStatuses }, 400);
      }

      // Update session
      await browserTestService.updateSession(
        sessionId,
        status || undefined,
        performanceSummary || undefined
      );

      // Re-fetch updated session
      const updated = await browserTestService.getSessionStatus(sessionId);

      if (!updated) {
        designSyncLogger.info({
          action: 'browser.session_update_not_found',
          sessionId,
        });
        return c.json({ error: 'session_not_found' }, 404);
      }

      designSyncLogger.info({
        action: 'browser.session_update_completed',
        sessionId,
        sessionStatus: updated.status,
        durationMs: Date.now() - startMs,
      });

      return c.json(updated, 200);
    } catch (error) {
      designSyncLogger.error({
        action: 'browser.session_update_failed',
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startMs,
      });
      return c.json({ error: 'internal_server_error' }, 500);
    }
  });
}
