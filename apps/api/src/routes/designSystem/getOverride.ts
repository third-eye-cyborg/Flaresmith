/**
 * GET /design/overrides/:id Route
 * 
 * Implements T054: Retrieve theme override status and details
 * 
 * Requirements:
 * - FR-023: Override submission tracking
 * - State visibility for approval workflow
 * 
 * Path Parameters:
 * - id: Override UUID
 * 
 * Response:
 * - override: ThemeOverride object with full state (status, diff, sizePct, approval details)
 * 
 * Error Codes:
 * - DESIGN_OVERRIDE_NOT_FOUND: Override ID doesn't exist
 */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/connection';
import { themeOverrides } from '../../../db/schema/designSystem';
import type { ThemeOverride } from '@flaresmith/types';
import { randomUUID } from 'node:crypto';

const app = new Hono();

/**
 * GET /design/overrides/:id
 * 
 * Retrieve a theme override by ID
 * 
 * @example
 * GET /design/overrides/123e4567-e89b-12d3-a456-426614174000
 */
app.get('/:id', async (c) => {
  const startTime = performance.now();
  const requestId = randomUUID();
  const overrideId = c.req.param('id');

  try {
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(overrideId)) {
      return c.json({
        error: {
          code: 'DESIGN_OVERRIDE_INVALID_ID',
          message: 'Invalid override ID format',
          severity: 'error',
          retryPolicy: 'none',
          requestId: requestId,
          timestamp: new Date().toISOString(),
          context: { overrideId },
          hint: 'Override ID must be a valid UUID',
        },
      }, 400);
    }

    // Query override
    const [override] = await db
      .select()
      .from(themeOverrides)
      .where(eq(themeOverrides.id, overrideId));

    if (!override) {
      return c.json({
        error: {
          code: 'DESIGN_OVERRIDE_NOT_FOUND',
          message: 'Override not found',
          severity: 'error',
          retryPolicy: 'none',
          requestId: requestId,
          timestamp: new Date().toISOString(),
          context: { overrideId },
          hint: 'Check that the override ID is correct',
        },
      }, 404);
    }

    const durationMs = performance.now() - startTime;

    // Map database record to ThemeOverride schema
    const response: ThemeOverride = {
      id: override.id,
      project_id: override.projectId,
      environment: override.environment as any,
      submitted_by: override.submittedBy,
      status: override.status as any,
      size_pct: override.sizePct,
      requires_approval: override.requiresApproval,
      token_diff: override.tokenDiff as any,
      approved_by: override.approvedBy,
      created_at: override.createdAt.toISOString(),
      updated_at: override.updatedAt.toISOString(),
    };

    if (override.rationale) {
      response.rationale = override.rationale;
    }

    return c.json({
      override: response,
      meta: {
        durationMs: Math.round(durationMs),
        requestId: requestId,
      },
    });
  } catch (error) {
    const durationMs = performance.now() - startTime;

    console.error('[GET /design/overrides/:id] Error:', {
      error: error instanceof Error ? error.message : String(error),
      requestId: requestId,
      overrideId,
      durationMs: Math.round(durationMs),
    });

    return c.json({
      error: {
        code: 'DESIGN_OVERRIDE_FETCH_FAILED',
        message: 'Failed to retrieve override',
        severity: 'error',
        retryPolicy: 'exponential_backoff',
        requestId: requestId,
        timestamp: new Date().toISOString(),
        context: { overrideId, durationMs: Math.round(durationMs) },
        hint: 'Check database connectivity and retry',
      },
    }, 500);
  }
});

export default app;
