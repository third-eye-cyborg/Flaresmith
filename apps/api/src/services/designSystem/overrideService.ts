/**
 * T050 & T051: Override Application Service
 * Feature: 004-design-system
 * User Story: US3 - User-Extensible Theming
 * FR-023, FR-024, FR-025, FR-005, FR-006
 *
 * Provides workflow for submitting, approving, and applying theme overrides.
 * State machine (data-model.md):
 * submitted → auto-applied (size ≤5% & valid)
 * submitted → pending-approval (5–10% & valid)
 * pending-approval → approved → auto-applied
 * submitted → rejected (invalid / size >10%)
 */

import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';
import { db } from '../../../db/connection';
import { designTokens, themeOverrides } from '../../../db/schema/designSystem';
import type { TokenDiff, DesignToken } from '@flaresmith/types';
import { OverrideValidationService, OVERRIDE_ERROR_CODES } from './overrideValidationService';
import { overrideRateLimitService } from './overrideRateLimitService';
import { BaseDesignSystemService, DesignAuditService } from './auditService';

export interface SubmitOverrideParams {
  projectId: string;
  environment: string; // dev|staging|prod
  diff: TokenDiff[];
  actorId: string;
  isPremium: boolean;
  correlationId?: string;
}

export interface SubmitOverrideResult {
  id: string;
  status: string;
  sizePct: number;
  requiresApproval: boolean;
  errors?: Array<{ code: string; message: string }>;
}

export interface ApproveOverrideParams {
  overrideId: string;
  approverId: string;
  correlationId?: string;
}

export class OverrideService extends BaseDesignSystemService {
  private validator = new OverrideValidationService();
  private audit = new DesignAuditService();

  /** Fetch current base tokens (latest version) */
  private async getBaseTokens(): Promise<DesignToken[]> {
    const rows = await db.select().from(designTokens);
    return rows.map((r: typeof designTokens.$inferSelect) => ({
      id: r.id,
      name: r.name,
      category: r.category as string,
      value: r.value as unknown,
      version: r.version,
      accessibility_meta: r.accessibilityMeta as Record<string, unknown> | undefined,
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    }));
  }

  /** Submit override; returns record summary */
  async submitOverride(params: SubmitOverrideParams): Promise<SubmitOverrideResult> {
    const correlationId = params.correlationId || crypto.randomUUID();

    // Rate limit check
    const rate = await overrideRateLimitService.checkRateLimit({
      projectId: params.projectId,
      isPremium: params.isPremium,
    });
    if (!rate.allowed) {
      return {
        id: 'pending', // not persisted
        status: 'rejected',
        sizePct: 0,
        requiresApproval: false,
        errors: [{ code: 'DESIGN_OVERRIDE_RATE_LIMIT', message: rate.reason || 'Rate limit exceeded' }],
      };
    }

    // Load base tokens & validate
    const baseTokens = await this.getBaseTokens();
    const validation = await this.validator.validateOverride({
      diff: params.diff,
      totalTokenCount: baseTokens.length,
      baseTokens,
    });

    // Determine status
    let status: string = 'submitted';
    if (!validation.valid) {
      // If size too large or invalid color/circular
      if (validation.errors.some(e => e.code === OVERRIDE_ERROR_CODES.TOO_LARGE)) {
        status = 'rejected';
      } else {
        status = 'rejected';
      }
    } else {
      if (validation.sizePct <= 5) status = 'auto-applied';
      else if (validation.requiresApproval) status = 'pending-approval';
    }

    // Build token_diff map
    const diffMap: Record<string, { oldValue?: unknown; newValue: unknown }> = {};
    for (const change of params.diff) {
      const base = baseTokens.find(t => t.name === change.name);
      diffMap[change.name] = {
        oldValue: base?.value,
        newValue: change.newValue,
      };
    }

    // Persist (unless pure rate-limit rejection)
    let overrideId = crypto.randomUUID();
    if (!validation.errors.some(e => e.code === 'DESIGN_OVERRIDE_RATE_LIMIT')) {
      const [inserted] = await db.insert(themeOverrides).values({
        id: overrideId,
        projectId: params.projectId,
        environment: params.environment,
        submittedBy: params.actorId,
        status: status as any,
        sizePct: validation.sizePct,
        requiresApproval: validation.requiresApproval,
        tokenDiff: diffMap,
      }).returning();
      if (inserted) {
        overrideId = inserted.id;
      }
    }

    // Audit log
    await this.audit.logOverrideSubmitted({
      correlationId,
      actor: params.actorId,
      projectId: params.projectId,
      environment: params.environment,
      sizePct: validation.sizePct,
      diffHash: createHash('sha256').update(JSON.stringify(diffMap)).digest('hex'),
    });

    const result: SubmitOverrideResult = {
      id: overrideId,
      status,
      sizePct: validation.sizePct,
      requiresApproval: validation.requiresApproval,
    };
    if (!validation.valid) {
      result.errors = validation.errors.map(e => ({ code: e.code, message: e.message }));
    }
    return result;
  }

  /** Approve pending override */
  async approveOverride(params: ApproveOverrideParams): Promise<{ id: string; status: string }> {
    const correlationId = params.correlationId || crypto.randomUUID();
    const [existing] = await db.select().from(themeOverrides).where(eq(themeOverrides.id, params.overrideId));
    if (!existing) throw new Error('Override not found');
    if (existing.status !== 'pending-approval') throw new Error('Override not in pending-approval state');

    const [updated] = await db.update(themeOverrides).set({
      status: 'auto-applied', // approved becomes auto-applied (applied to token generation next run)
      approvedBy: params.approverId,
    }).where(eq(themeOverrides.id, params.overrideId)).returning();

    await this.audit.logOverrideApplied({
      correlationId,
      actor: params.approverId,
      projectId: existing.projectId,
      environment: existing.environment,
      version: 0, // version update done when merge executed (future task T056)
      durationMs: 0,
    });

    return { id: updated.id, status: updated.status };
  }

  /**
   * T060: Check environment parity before promotion
   * FR-021: Block staging→prod promotion if pending-approval overrides exist in staging
   * @param projectId - Project UUID
   * @param sourceEnv - Source environment (e.g., 'staging')
   * @param targetEnv - Target environment (e.g., 'prod')
   * @returns { allowed: boolean, reason?: string, pendingOverrides?: string[] }
   */
  async checkEnvironmentParityForPromotion(params: {
    projectId: string;
    sourceEnv: string;
    targetEnv: string;
  }): Promise<{
    allowed: boolean;
    reason?: string;
    pendingOverrides?: Array<{ id: string; sizePct: number; submittedBy: string }>;
  }> {
    // Only enforce for staging→prod promotions
    if (params.sourceEnv !== 'staging' || params.targetEnv !== 'prod') {
      return { allowed: true };
    }

    // Query for pending-approval overrides in staging environment
    const pendingOverrides = await db
      .select({
        id: themeOverrides.id,
        sizePct: themeOverrides.sizePct,
        submittedBy: themeOverrides.submittedBy,
      })
      .from(themeOverrides)
      .where(
        and(
          eq(themeOverrides.projectId, params.projectId),
          eq(themeOverrides.environment, params.sourceEnv),
          eq(themeOverrides.status, 'pending-approval')
        )
      );

    if (pendingOverrides.length > 0) {
      return {
        allowed: false,
        reason: `${pendingOverrides.length} pending override(s) in staging must be approved before promoting to prod`,
        pendingOverrides: pendingOverrides.map((o: typeof pendingOverrides[0]) => ({
          id: o.id,
          sizePct: o.sizePct,
          submittedBy: o.submittedBy,
        })),
      };
    }

    return { allowed: true };
  }
}

export const overrideService = new OverrideService();
