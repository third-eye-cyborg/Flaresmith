/**
 * T016: POST /auth/refresh route
 * Token refresh with session rotation
 * FR-003: Neon Auth Migration - User Story 1
 */

import { Hono } from 'hono';
import { RefreshRequestSchema, RefreshResponseSchema } from '@flaresmith/types';
import { AuthService } from '../../services/auth/authService';
import { getDb } from '../../../db/connection';
import { logger } from '../../lib/logger';
import { AUTH_ERRORS } from '../../types/errors';
import { incrementCounter, observeHistogram, METRICS } from '../../lib/metrics';

const app = new Hono();

app.post('/', async (c) => {
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();
  const start = Date.now();

  try {
    const body = await c.req.json();
    const validationResult = RefreshRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validationResult.error.issues,
          requestId
        }
      }, 400);
    }

    const { refreshToken } = validationResult.data;

    const env = c.env as any;
    const db = getDb(env.DATABASE_URL);
    const authService = new AuthService(db);

    // Refresh session (rotates tokens)
    const tokens = await authService.refreshSession({
      refreshToken,
      requestId
    });

    const response = {
      accessToken: tokens.accessToken,
      accessExpiresAt: tokens.accessExpiresAt.toISOString(),
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: tokens.refreshExpiresAt.toISOString(),
    };

    RefreshResponseSchema.parse(response); // Validate

    incrementCounter(METRICS.authRefreshSuccess);
    observeHistogram(METRICS.authLatencyMs, (Date.now() - start) / 1000);
    logger.info({
      requestId,
      sessionId: tokens.sessionId,
      msg: 'Session refreshed successfully'
    });

    return c.json(response, 200);

  } catch (error: any) {
    observeHistogram(METRICS.authLatencyMs, (Date.now() - start) / 1000);
    logger.error({
      requestId,
      error: error.message,
      msg: 'Session refresh failed'
    });

    // Token expired
    if (error.message === 'AUTH_TOKEN_EXPIRED') {
      const errorDef = AUTH_ERRORS.REFRESH_TOKEN_EXPIRED!;
      return c.json({
        error: {
          code: errorDef.code,
          message: errorDef.message,
          severity: errorDef.severity,
          retryPolicy: errorDef.retryPolicy,
          hint: errorDef.hint,
          requestId,
          timestamp: new Date().toISOString()
        }
      }, 401);
    }

    // Token reused (security event)
    if (error.message === 'AUTH_REFRESH_REUSED') {
      const errorDef = AUTH_ERRORS.REFRESH_TOKEN_REUSED!;
      return c.json({
        error: {
          code: errorDef.code,
          message: errorDef.message,
          severity: errorDef.severity,
          retryPolicy: errorDef.retryPolicy,
          hint: errorDef.hint,
          requestId,
          timestamp: new Date().toISOString()
        }
      }, 401);
    }

    // Invalid token
    return c.json({
      error: {
        code: 'AUTH_SESSION_NOT_FOUND',
        message: 'Invalid or expired refresh token',
        requestId,
        timestamp: new Date().toISOString()
      }
    }, 401);
  }
});

export default app;
