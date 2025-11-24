// T043: Enhanced sync service integrating canonicalization & drift detection
// Feature: 006-design-sync-integration
// Responsibilities implemented in this iteration:
//  - Build drift diff summary using detectDrift util
//  - Support dryRun (no persistence / undo)
//  - Persist sync operation & undo entry with canonical operation hash
//  - Produce reversibleUntil window (24h default)
//  - Provide placeholder pre/post state hashing (to be refined later)

import { ExecuteSyncInput, SyncOperationResult } from '@packages/types/src/design-sync/syncOperation';
import { db } from '../../db/connection';
import { syncOperations, undoStackEntries } from '../../db/schema/designSync';
import { designSyncLogger } from '../logging/designSyncLogger';
import { detectDrift, DriftSource } from '../utils/designSync/driftDetect';
import { buildCanonicalizedOperation } from '../utils/designSync/canonicalize';

export interface DesignSyncServiceDeps {
  now?: () => Date;
  maxUndoOps?: number; // default 50
  undoWindowHours?: number; // default 24
}

function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map(k => `"${k}":${stableStringify(obj[k])}`).join(',')}}`;
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    return nodeCrypto.createHash('sha256').update(input).digest('hex');
  }
}

export class DesignSyncService {
  private readonly now: () => Date;
  private readonly maxUndoOps: number;
  private readonly undoWindowHours: number;

  constructor(private readonly deps: DesignSyncServiceDeps = {}) {
    this.now = deps.now ?? (() => new Date());
    this.maxUndoOps = deps.maxUndoOps ?? 50;
    this.undoWindowHours = deps.undoWindowHours ?? 24;
  }

  async execute(input: ExecuteSyncInput): Promise<SyncOperationResult> {
    const start = performance.now();
    // Build drift sources (placeholder: simulate version diff per component)
    const sources: DriftSource[] = input.components.map(c => ({
      componentId: c.componentId,
      code: { version: 1 },
      design: { version: 2 },
    }));

    const drift = detectDrift(sources);
    const diffSummary = { total: drift.total, items: drift.items } as any; // Aligning with SyncOperationResult schema diffSummary shape

    if (input.dryRun) {
      const reversibleUntil = new Date(this.now().getTime() + this.undoWindowHours * 3600_000).toISOString();
      const durationMs = Math.round(performance.now() - start);
      designSyncLogger.info({ action: 'sync.dryRun', componentCount: input.components.length, durationMs });
      return {
        operationId: crypto.randomUUID(),
        status: 'pending',
        components: input.components.map(c => c.componentId),
        diffSummary,
        reversibleUntil,
      } as SyncOperationResult;
    }

    // Canonicalize diff items for operation hash
    const rawCanonicalInputs = drift.items.map(i => ({ componentId: i.componentId, changeTypes: i.changeTypes, severity: i.severity }));
    const directionModes = input.components.reduce((acc, c) => { acc[c.componentId] = c.direction; return acc; }, {} as Record<string,string>);
    const { operationHash } = await buildCanonicalizedOperation(rawCanonicalInputs as any, input.components.map(c => c.componentId), directionModes);

    const reversibleUntilDate = new Date(this.now().getTime() + this.undoWindowHours * 3600_000);

    // Pre/Post state hashes (placeholder diff application: unify versions)
    const preStateHash = await sha256Hex(stableStringify(sources.map(s => s.code)));
    const postSources = sources.map(s => ({ ...s, code: { version: 2 }, design: { version: 2 } }));
    const postStateHash = await sha256Hex(stableStringify(postSources.map(s => s.code)));

    // Persist sync operation row
    const [row] = await db.insert(syncOperations).values({
      componentsAffected: input.components.map(c => c.componentId),
      directionModes,
      diffSummary,
      reversibleUntil: reversibleUntilDate.toISOString() as any,
      operationHash,
      status: 'completed',
    }).returning();

    // Enforce undo cap (simplistic; proper pruning in later task)
    const existingUndoCount = await db.select().from(undoStackEntries); // TODO: filter non-expired
    if (existingUndoCount.length >= this.maxUndoOps) {
      // Future: prune oldest; for now log warning
      designSyncLogger.warn({ action: 'undo.cap.reached', maxUndoOps: this.maxUndoOps });
    }

    await db.insert(undoStackEntries).values({
      syncOperationId: row.id,
      preStateHash,
      postStateHash,
      expiration: reversibleUntilDate.toISOString() as any,
    });

    const durationMs = Math.round(performance.now() - start);
    await db.update(syncOperations).set({ durationMs }).where(syncOperations.id.eq(row.id));
    designSyncLogger.info({ action: 'sync.execute', operationId: row.id, componentCount: input.components.length, durationMs, diffItems: drift.total });

    return {
      operationId: row.id,
      status: 'completed',
      components: input.components.map(c => c.componentId),
      diffSummary,
      reversibleUntil: reversibleUntilDate.toISOString(),
    } as SyncOperationResult;
  }
}

export const designSyncService = new DesignSyncService();
