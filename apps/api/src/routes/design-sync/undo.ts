// T047: POST /design-sync/undo route handler
// Feature: 006-design-sync-integration
// Responsibilities: Validate UndoRequest, invoke undo service, return UndoResult envelope.
// Spec References: FR-002 (undo), FR-009 (audit logging), SC-003 (success rate)

import { Hono } from 'hono';
import { UndoRequest } from '@packages/types/src/design-sync/undo';
import { designUndoService } from '../../services/designUndoService';
import { designSyncLogger } from '../../logging/designSyncLogger';

export function registerUndoRoutes(router: Hono) {
  router.post('/undo', async (c) => {
    try {
      const raw = await c.req.json();
      const parsed = UndoRequest.safeParse(raw);
      if (!parsed.success) {
        designSyncLogger.warn({ action: 'undo.validate.fail', issues: parsed.error.issues });
        return c.json({ error: 'validation_failed', issues: parsed.error.issues }, 400);
      }
      const result = await designUndoService.undo(parsed.data);
      return c.json(result, 200);
    } catch (err: any) {
      designSyncLogger.error({ action: 'undo.error', message: err?.message });
      return c.json({ error: 'undo_failed', message: 'Unable to undo operation.' }, 500);
    }
  });
}
