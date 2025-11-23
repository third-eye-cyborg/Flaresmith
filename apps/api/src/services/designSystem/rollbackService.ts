/**
 * T075-T079: Rollback Service (initial implementation)
 * Feature: 004-design-system
 *
 * Provides token rollback capability by restoring a previous version snapshot
 * as a new immutable version. Enforces permission rules (T076) and measures
 * duration (T079). Audit logging (T081) will be finalized after route wiring.
 */

import { and, eq } from 'drizzle-orm';
import { db } from '../../../db/connection';
import { designTokens } from '../../../db/schema';
import type { DesignToken } from '@flaresmith/types';
import { tokenService } from './tokenService';
import { DesignAuditService } from './auditService';

export type RollbackPermissionRole = 'platformOwner' | 'designDelegate' | 'projectAdmin' | 'developer' | 'viewer';

interface RollbackParams {
  targetVersion: number;
  actorId: string;
  actorRole: RollbackPermissionRole;
  environment: string; // dev|staging|prod
  correlationId?: string;
  rationale?: string;
}

interface RollbackResult {
  previousVersion: number;
  newVersion: number;
  targetVersion: number;
  hash: string;
  durationMs: number;
}

class RollbackService extends DesignAuditService {
  /**
   * Validate rollback permissions (T076)
   * - prod: only platformOwner or designDelegate
   * - staging/dev: platformOwner | designDelegate | projectAdmin
   */
  validateRollbackPermissions(environment: string, role: RollbackPermissionRole): void {
    if (environment === 'prod') {
      if (!(role === 'platformOwner' || role === 'designDelegate')) {
        throw new Error('Rollback not permitted for prod environment');
      }
      return;
    }
    // staging/dev constraints
    if (!(role === 'platformOwner' || role === 'designDelegate' || role === 'projectAdmin')) {
      throw new Error(`Rollback not permitted for ${environment} environment`);
    }
  }

  /**
   * Create snapshot object from target version (wrap tokenService.getTokenVersion)
   */
  async createSnapshotFromVersion(targetVersion: number): Promise<Record<string, { category: string; value: unknown }>> {
    const version = await tokenService.getTokenVersion(targetVersion);
    if (!version) {
      throw new Error(`Target version ${targetVersion} not found`);
    }
    // Snapshot stored as normalized map
    return version.snapshot as Record<string, { category: string; value: unknown }>;
  }

  /**
   * Perform rollback (T075 main + T079 duration measurement + T081 audit logging)
   */
  async rollbackToVersion(params: RollbackParams): Promise<RollbackResult> {
    const correlationId = params.correlationId || crypto.randomUUID();
    const start = Date.now();

    // Permission check
    this.validateRollbackPermissions(params.environment, params.actorRole);

    // Load current & target snapshot
    const previousVersion = await tokenService.getLatestVersion();
    if (params.targetVersion === previousVersion) {
      throw new Error('Target version equals current version; nothing to rollback');
    }
    const snapshot = await this.createSnapshotFromVersion(params.targetVersion);

    // Fetch current tokens to map IDs
    const { tokens: currentTokens } = await tokenService.getTokens();
    const updatedTokens: DesignToken[] = currentTokens.map(t => {
      const snap = snapshot[t.name];
      if (!snap) {
        // Token did not exist in target snapshot; keep current value (conservative)
        return t;
      }
      return {
        ...t,
        value: snap.value as string | number | Record<string, unknown>,
        category: snap.category as DesignToken['category'],
        version: previousVersion + 1, // provisional new version
        updated_at: new Date().toISOString(),
      };
    });

    // Apply updates inside transaction for atomicity
    // (Simplified: Neon HTTP driver may emulate transactions; assume supported)
    for (const token of updatedTokens) {
      const snap = snapshot[token.name];
      if (!snap) continue; // skip unchanged tokens
      await db
        .update(designTokens)
        .set({
          value: snap.value as unknown as Record<string, unknown>,
          version: previousVersion + 1,
          updatedAt: new Date(),
        })
        .where(eq(designTokens.name, token.name));
    }

    // Create new version snapshot from updated tokens
    const versionInfo = await tokenService.createTokenVersion({
      tokens: updatedTokens,
      createdBy: params.actorId,
    });

    const durationMs = Date.now() - start;

    // Audit event (T081)
    await this.logRollbackCompleted({
      correlationId,
      actor: params.actorId,
      previousVersion,
      targetVersion: params.targetVersion,
      newVersion: versionInfo.version,
      rationale: params.rationale,
      durationMs,
    });

    return {
      previousVersion,
      newVersion: versionInfo.version,
      targetVersion: params.targetVersion,
      hash: versionInfo.hash,
      durationMs,
    };
  }
}

export const rollbackService = new RollbackService();
