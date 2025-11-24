/**
 * T015: POST /auth/login route
 * Email+password authentication with session creation
 * FR-003: Neon Auth Migration - User Story 1
 */

import { Hono } from 'hono';
import { LoginRequestSchema, AuthResponseSchema } from '@flaresmith/types';
import { AuthService } from '../../services/auth/authService';
import { getDb } from '../../../db/connection';
import { logger } from '../../lib/logger';
import { AUTH_ERRORS } from '../../types/errors';
import { incrementCounter, observeHistogram, METRICS } from '../../lib/metrics';

const app = new Hono();

app.post('/', async (c) => {
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();
  const start = Date.now();
  incrementCounter(METRICS.authSignInAttempts);

  try {
    const body = await c.req.json();
    const validationResult = LoginRequestSchema.safeParse(body);

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

    const { email, password } = validationResult.data;

    const env = c.env as any;
    const db = getDb(env.DATABASE_URL);
    const authService = new AuthService(db);

    // Authenticate user
    const user = await authService.authenticateEmailPassword({
      email,
      password,
      requestId
    });

    // Create session
    const tokens = await authService.createSession({
      userId: user.id,
      requestId
    });

    const response = {
      accessToken: tokens.accessToken,
      accessExpiresAt: tokens.accessExpiresAt.toISOString(),
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: tokens.refreshExpiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      }
    };

    AuthResponseSchema.parse(response); // Validate

    incrementCounter(METRICS.authSignInSuccess);
    observeHistogram(METRICS.authLatencyMs, (Date.now() - start) / 1000);
    logger.info({
      requestId,
      userId: user.id,
      msg: 'User logged in successfully'
    });

    return c.json(response, 200);

  } catch (error: any) {
    observeHistogram(METRICS.authLatencyMs, (Date.now() - start) / 1000);
    logger.error({
      requestId,
      error: error.message,
      msg: 'Login failed'
    });

    if (error.message === 'AUTH_INVALID_CREDENTIALS') {
      const errorDef = AUTH_ERRORS.INVALID_CREDENTIALS!;
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

    return c.json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        requestId,
        timestamp: new Date().toISOString()
      }
    }, 500);
  }
});

export default app;
