/**
 * PATCH /design/overrides/:id/approve Route
 * 
 * Implements T055: Approve pending theme override
 * 
 * Requirements:
 * - FR-024: Approval workflow for 5-10% overrides
 * - Permission check: Only platformOwner or designDelegate can approve
 * - State transition: pending-approval → approved → auto-applied
 * 
 * Path Parameters:
 * - id: Override UUID
 * 
 * Response:
 * - override: Updated ThemeOverride with status=auto-applied and approvedBy set
 * 
 * Error Codes:
 * - DESIGN_OVERRIDE_NOT_FOUND: Override ID doesn't exist
 * - DESIGN_OVERRIDE_APPROVAL_FORBIDDEN: Insufficient permissions
 * - DESIGN_OVERRIDE_INVALID_STATE: Override not in pending-approval state
 */

import { Hono } from 'hono';
import { overrideService } from '../../services/designSystem/overrideService';
import { randomUUID } from 'node:crypto';

const app = new Hono();

/**
 * PATCH /design/overrides/:id/approve
 * 
 * Approve a pending theme override (transitions to auto-applied)
 * 
 * @example
 * PATCH /design/overrides/123e4567-e89b-12d3-a456-426614174000/approve
 */
app.patch('/:id/approve', async (c) => {
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

    // Extract approver from context
    // TODO: Replace with actual auth middleware context extraction
    const approverId = c.req.header('X-Actor-Id') || '00000000-0000-0000-0000-000000000000';
    const userRole = c.req.header('X-User-Role') || 'user';

    // Permission check: Only platformOwner or designDelegate can approve
    if (!['platformOwner', 'designDelegate'].includes(userRole)) {
      return c.json({
        error: {
          code: 'DESIGN_OVERRIDE_APPROVAL_FORBIDDEN',
          message: 'Insufficient permissions to approve overrides',
          severity: 'error',
          retryPolicy: 'none',
          requestId: requestId,
          timestamp: new Date().toISOString(),
          context: { overrideId, userRole },
          hint: 'Only platformOwner or designDelegate roles can approve overrides',
        },
      }, 403);
    }

    // Approve override
    const result = await overrideService.approveOverride({
      overrideId,
      approverId,
      correlationId: requestId,
    });

    const durationMs = performance.now() - startTime;

    return c.json({
      override: {
        id: result.id,
        status: result.status,
      },
      meta: {
        durationMs: Math.round(durationMs),
        requestId: requestId,
        approvedBy: approverId,
      },
    });
  } catch (error) {
    const durationMs = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error('[PATCH /design/overrides/:id/approve] Error:', {
      error: errorMessage,
      requestId: requestId,
      overrideId,
      durationMs: Math.round(durationMs),
    });

    // Map error messages to specific codes
    let errorCode = 'DESIGN_OVERRIDE_APPROVAL_FAILED';
    let statusCode: 500 | 404 | 422 = 500;

    if (errorMessage.includes('not found')) {
      errorCode = 'DESIGN_OVERRIDE_NOT_FOUND';
      statusCode = 404;
    } else if (errorMessage.includes('not in pending-approval state')) {
      errorCode = 'DESIGN_OVERRIDE_INVALID_STATE';
      statusCode = 422;
    }

    return c.json({
      error: {
        code: errorCode,
        message: errorMessage,
        severity: 'error',
        retryPolicy: statusCode === 500 ? 'exponential_backoff' : 'none',
        requestId: requestId,
        timestamp: new Date().toISOString(),
        context: { overrideId, durationMs: Math.round(durationMs) },
        hint: errorCode === 'DESIGN_OVERRIDE_INVALID_STATE'
          ? 'Override must be in pending-approval state to be approved'
          : 'Check database connectivity and retry',
      },
    }, statusCode);
  }
});

export default app;
