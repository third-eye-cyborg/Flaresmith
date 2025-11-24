// T045: POST /design-sync/operations route handler
// Feature: 006-design-sync-integration
// Responsibilities: Validate input, enforce access (middleware already applied), invoke service, return SyncOperationResult.
// Spec References: FR-001, FR-005, FR-009, FR-020

import { Hono } from 'hono';
import { ExecuteSyncInput } from '@packages/types/src/design-sync/syncOperation';
import { designSyncService } from '../../services/designSyncService';
import { designSyncLogger } from '../../logging/designSyncLogger';

export function registerSyncRoutes(router: Hono) {
  router.post('/operations', async (c) => {
    try {
      const raw = await c.req.json();
      const parsed = ExecuteSyncInput.safeParse(raw);
      if (!parsed.success) {
        designSyncLogger.warn({ action: 'sync.validate.fail', issues: parsed.error.issues });
        return c.json({ error: 'validation_failed', issues: parsed.error.issues }, 400);
      }
      const result = await designSyncService.execute(parsed.data);
      return c.json(result, 200);
    } catch (err: any) {
      designSyncLogger.error({ action: 'sync.execute.error', message: err?.message, stack: err?.stack });
      return c.json({ error: 'sync_failed', message: 'Unexpected error executing sync.' }, 500);
    }
  });
}
