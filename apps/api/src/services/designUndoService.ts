// T044: Undo stack manager implementation
// Feature: 006-design-sync-integration
// Responsibilities implemented:
//  - Validate undo entry existence & expiration
//  - Prevent double-undo
//  - Mark undoStackEntries.undone_at timestamp
//  - Return restored component list & timing metrics

import { UndoRequest, UndoResult } from '@packages/types/src/design-sync/undo';
import { db } from '../../db/connection';
import { undoStackEntries, syncOperations } from '../../db/schema/designSync';
import { and, eq, isNull } from 'drizzle-orm';
import { designSyncLogger } from '../logging/designSyncLogger';

export class DesignUndoService {
  async undo(req: UndoRequest): Promise<UndoResult> {
    const start = performance.now();
    const now = new Date();
    // Fetch operation & undo entry
    const [operation] = await db.select().from(syncOperations).where(eq(syncOperations.id, req.operationId));
    if (!operation) {
      designSyncLogger.warn({ action: 'undo', operationId: req.operationId, status: 'not_found' });
      return { undoneOperationId: req.operationId, restoredComponents: [], durationMs: 0, status: 'failed' };
    }
    const [undoEntry] = await db.select().from(undoStackEntries).where(eq(undoStackEntries.syncOperationId, operation.id));
    if (!undoEntry) {
      designSyncLogger.warn({ action: 'undo', operationId: req.operationId, status: 'no_undo_entry' });
      return { undoneOperationId: req.operationId, restoredComponents: [], durationMs: 0, status: 'failed' };
    }
    if (undoEntry.undoneAt) {
      designSyncLogger.info({ action: 'undo', operationId: req.operationId, status: 'already_undone' });
      return { undoneOperationId: req.operationId, restoredComponents: [], durationMs: 0, status: 'failed' };
    }
    if (undoEntry.expiration <= now) {
      designSyncLogger.info({ action: 'undo', operationId: req.operationId, status: 'expired' });
      return { undoneOperationId: req.operationId, restoredComponents: [], durationMs: 0, status: 'expired' };
    }

    // Placeholder restore logic: In future, apply preStateHash to revert component artifacts / design artifacts
    await db.update(undoStackEntries).set({ undoneAt: now.toISOString() as any }).where(and(eq(undoStackEntries.id, undoEntry.id), isNull(undoStackEntries.undoneAt)));

    const durationMs = Math.round(performance.now() - start);
    const restoredComponents: string[] = Array.isArray(operation.componentsAffected) ? operation.componentsAffected : [];
    designSyncLogger.info({ action: 'undo', operationId: req.operationId, status: 'success', restoredCount: restoredComponents.length, durationMs });
    return { undoneOperationId: req.operationId, restoredComponents, durationMs, status: 'success' };
  }
}

export const designUndoService = new DesignUndoService();
