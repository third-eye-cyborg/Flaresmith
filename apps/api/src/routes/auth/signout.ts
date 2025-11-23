/**
 * T026: POST /api/auth/signout
 * Revoke current session (single device sign-out)
 * Requires valid access token to identify session
 */

import { Hono } from 'hono';
import { getDb } from '../../../db/connection';
import { AuthService } from '../../services/auth/authService';
import { logger } from '../../lib/logger';
import { AUTH_ERRORS } from '../../types/errors';
import { incrementCounter, observeHistogram, METRICS } from '../../lib/metrics';
import { verifyToken } from '../../lib/jwt';

const app = new Hono();

/**
 * Sign out current session
 * Extracts session ID from access token, revokes session
 */
app.post('/', async (c) => {
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();
  const start = Date.now();

  try {
    // Get access token from Authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.error({
        requestId,
        msg: 'Missing or invalid Authorization header',
        code: 'AUTH_TOKEN_MISSING'
      });
      return c.json(
        {
          error: {
            ...AUTH_ERRORS.AUTH_TOKEN_MISSING,
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
        401
      );
    }

    const accessToken = authHeader.substring(7); // Remove "Bearer "

    // Verify token and extract session ID
    const payload = await verifyToken(accessToken);
    if (!payload || !payload.sessionId) {
      logger.error({
        requestId,
        msg: 'Invalid access token or missing sessionId',
        code: 'AUTH_TOKEN_INVALID'
      });
      return c.json(
        {
          error: {
            ...AUTH_ERRORS.AUTH_TOKEN_INVALID,
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
        401
      );
    }

    const db = getDb(c.env as any);
    const authService = new AuthService(db);

    // Revoke the session
    await authService.revokeSession(payload.sessionId as string, requestId);

    incrementCounter(METRICS.authSignOutTotal);
    observeHistogram(METRICS.authLatencyMs, (Date.now() - start) / 1000);
    logger.info({
      requestId,
      sessionId: payload.sessionId,
      userId: payload.userId,
      msg: 'User signed out successfully'
    });

    // Return 204 No Content (successful sign-out)
    return c.body(null, 204);
  } catch (error) {
    observeHistogram(METRICS.authLatencyMs, (Date.now() - start) / 1000);
    logger.error({
      requestId,
      error: error instanceof Error ? error.message : String(error),
      msg: 'Sign-out failed',
      code: 'AUTH_SIGNOUT_FAILED'
    });

    return c.json(
      {
        error: {
          code: 'AUTH_SIGNOUT_FAILED',
          message: 'Failed to sign out. Please try again.',
          severity: 'error',
          retryPolicy: 'manual',
          requestId,
          timestamp: new Date().toISOString(),
          hint: 'Check if your session is still valid.',
        },
      },
      500
    );
  }
});

export default app;
