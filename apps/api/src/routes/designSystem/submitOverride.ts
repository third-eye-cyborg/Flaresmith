/**
 * POST /design/overrides Route
 * 
 * Implements T052-T053: Submit theme override with validation and rate limiting
 * 
 * Requirements:
 * - FR-024: Override size policy (≤5% auto, 5-10% approval, >10% reject)
 * - FR-025: Rate limiting (20/day standard, 40/day premium, 5/hour burst)
 * - FR-015: Circular reference detection
 * - SC-004: 100% rejection of malformed/circular references
 * 
 * Request Body:
 * - environment: Target environment (dev|staging|prod)
 * - diff: Array of token changes (name, oldValue?, newValue)
 * - rationale: Optional explanation (≤500 chars)
 * 
 * Response:
 * - override: ThemeOverride object with status, sizePct, requiresApproval, errors[]
 * 
 * Error Codes:
 * - DESIGN_OVERRIDE_TOO_LARGE: >10% of tokens
 * - DESIGN_OVERRIDE_RATE_LIMIT: Submission quota exceeded
 * - DESIGN_OVERRIDE_CIRCULAR_REFERENCE: Circular token dependencies
 * - DESIGN_OVERRIDE_INVALID_COLOR: Malformed color value
 */

import { Hono } from 'hono';
import { ApplyOverrideRequest, ApplyOverrideResponse } from '@flaresmith/types';
import { overrideService } from '../../services/designSystem/overrideService';
import { randomUUID } from 'node:crypto';

const app = new Hono();

/**
 * POST /design/overrides
 * 
 * Submit a new theme override for validation and application
 * 
 * @example
 * POST /design/overrides
 * {
 *   "environment": "dev",
 *   "diff": [
 *     { "name": "accent.blue.600", "oldValue": "#3B82F6", "newValue": "#2563EB" }
 *   ],
 *   "rationale": "Improve brand consistency"
 * }
 */
app.post('/', async (c) => {
  const startTime = performance.now();
  const requestId = randomUUID();

  try {
    // Parse and validate request body
    const body = await c.req.json();
    const validationResult = ApplyOverrideRequest.safeParse(body);

    if (!validationResult.success) {
      return c.json({
        error: {
          code: 'DESIGN_OVERRIDE_INVALID_REQUEST',
          message: 'Invalid override submission',
          severity: 'error',
          retryPolicy: 'none',
          requestId: requestId,
          timestamp: new Date().toISOString(),
          context: { errors: validationResult.error.errors },
          hint: 'Ensure environment is valid and diff array contains 1-40 token changes',
        },
      }, 400);
    }

    const { environment, diff, rationale } = validationResult.data;

    // Extract actor and project from context
    // TODO: Replace with actual auth middleware context extraction
    const actorId = c.req.header('X-Actor-Id') || '00000000-0000-0000-0000-000000000000';
    const projectId = c.req.header('X-Project-Id') || '00000000-0000-0000-0000-000000000000';

    // Determine if project has premium plan
    // TODO: Replace with actual project tier lookup
    const isPremium = false;

    // Submit override
    const result = await overrideService.submitOverride({
      projectId,
      environment,
      diff,
      actorId,
      isPremium,
      correlationId: requestId,
    });

    const durationMs = performance.now() - startTime;

    // If override was rejected, return 422
    if (result.status === 'rejected') {
      return c.json({
        error: {
          code: result.errors?.[0]?.code || 'DESIGN_OVERRIDE_REJECTED',
          message: 'Override submission rejected',
          severity: 'error',
          retryPolicy: 'none',
          requestId: requestId,
          timestamp: new Date().toISOString(),
          context: {
            overrideId: result.id,
            sizePct: result.sizePct,
            errors: result.errors,
            durationMs: Math.round(durationMs),
          },
          hint: result.errors?.some(e => e.code === 'DESIGN_OVERRIDE_TOO_LARGE')
            ? 'Reduce override scope to ≤10% of tokens'
            : 'Check validation errors for details',
        },
      }, 422);
    }

    // Build override object for response (conforming to ThemeOverride schema)
    const override = {
      id: result.id,
      project_id: projectId,
      environment: environment as any,
      submitted_by: actorId,
      status: result.status as any,
      size_pct: result.sizePct,
      requires_approval: result.requiresApproval,
      token_diff: diff,
      approved_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (rationale) {
      (override as any).rationale = rationale;
    }

    // Success response
    const response: ApplyOverrideResponse = {
      override,
    };

    return c.json({
      ...response,
      meta: {
        durationMs: Math.round(durationMs),
        requestId: requestId,
        status: result.status,
        requiresApproval: result.requiresApproval,
      },
    }, result.status === 'auto-applied' ? 200 : 202);
  } catch (error) {
    const durationMs = performance.now() - startTime;

    console.error('[POST /design/overrides] Error:', {
      error: error instanceof Error ? error.message : String(error),
      requestId: requestId,
      durationMs: Math.round(durationMs),
    });

    return c.json({
      error: {
        code: 'DESIGN_OVERRIDE_SUBMISSION_FAILED',
        message: 'Failed to submit override',
        severity: 'error',
        retryPolicy: 'exponential_backoff',
        requestId: requestId,
        timestamp: new Date().toISOString(),
        context: { durationMs: Math.round(durationMs) },
        hint: 'Check service health and retry',
      },
    }, 500);
  }
});

export default app;
