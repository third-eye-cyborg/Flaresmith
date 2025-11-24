// T092: Pruning job for undo history and coverage cache
// Feature: 006-design-sync-integration
// Clean up old undo snapshots and coverage cache entries
// Spec References: FR-015 (undo), FR-017 (coverage)

import { db } from '../../db/connection';
import { undoSnapshots, coverageCache } from '../../db/schema/designSync';
import { lt } from 'drizzle-orm';
import { designSyncLogger } from '../lib/designSyncLogger';

export interface PruneConfig {
  undoRetentionDays: number; // Keep undo snapshots for N days
  coverageRetentionDays: number; // Keep coverage cache for N days
}

const DEFAULT_PRUNE_CONFIG: PruneConfig = {
  undoRetentionDays: 30,
  coverageRetentionDays: 7,
};

/**
 * Prune old undo snapshots
 */
async function pruneUndoSnapshots(retentionDays: number): Promise<number> {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(undoSnapshots)
    .where(lt(undoSnapshots.createdAt, cutoffDate));

  return result.rowCount || 0;
}

/**
 * Prune old coverage cache entries
 */
async function pruneCoverageCache(retentionDays: number): Promise<number> {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(coverageCache)
    .where(lt(coverageCache.createdAt, cutoffDate));

  return result.rowCount || 0;
}

/**
 * Run daily pruning job
 */
export async function runDesignSyncPruneJob(config: Partial<PruneConfig> = {}): Promise<void> {
  const startMs = Date.now();
  const finalConfig = { ...DEFAULT_PRUNE_CONFIG, ...config };

  designSyncLogger.info({
    action: 'design.prune_job_started',
    undoRetentionDays: finalConfig.undoRetentionDays,
    coverageRetentionDays: finalConfig.coverageRetentionDays,
  });

  try {
    const [undoDeleted, coverageDeleted] = await Promise.all([
      pruneUndoSnapshots(finalConfig.undoRetentionDays),
      pruneCoverageCache(finalConfig.coverageRetentionDays),
    ]);

    designSyncLogger.info({
      action: 'design.prune_job_completed',
      undoDeleted,
      coverageDeleted,
      durationMs: Date.now() - startMs,
    });
  } catch (error) {
    designSyncLogger.error({
      action: 'design.prune_job_failed',
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startMs,
    });
    throw error;
  }
}
