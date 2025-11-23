/**
 * T027: POST /api/auth/signoutAll
 * Revoke all sessions for current user (sign out everywhere)
 * Requires valid access token to identify user
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
 * Sign out all sessions for current user
 * Revokes all active sessions across all devices
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

    // Verify token and extract user ID
    const payload = await verifyToken(accessToken);
    if (!payload || !payload.userId) {
      logger.error({
        requestId,
        msg: 'Invalid access token or missing userId',
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

    // Revoke all user sessions
    await authService.revokeAllSessions(payload.userId, requestId);

    incrementCounter(METRICS.authSignOutAllTotal);
    observeHistogram(METRICS.authLatencyMs, (Date.now() - start) / 1000);
    logger.info({
      requestId,
      userId: payload.userId,
      msg: 'All user sessions revoked (signed out everywhere)'
    });

    // Return 204 No Content (successful sign-out)
    return c.body(null, 204);
  } catch (error) {
    observeHistogram(METRICS.authLatencyMs, (Date.now() - start) / 1000);
    logger.error({
      requestId,
      error: error instanceof Error ? error.message : String(error),
      msg: 'Sign-out all failed',
      code: 'AUTH_SIGNOUT_FAILED'
    });

    return c.json(
      {
        error: {
          code: 'AUTH_SIGNOUT_FAILED',
          message: 'Failed to sign out from all devices. Please try again.',
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
