/**
 * T014: POST /auth/register route
 * Email+password registration with session creation
 * FR-003: Neon Auth Migration - User Story 1
 */

import { Hono } from 'hono';
import { RegisterRequestSchema, AuthResponseSchema } from '@flaresmith/types';
import { AuthService } from '../../services/auth/authService';
import { getDb } from '../../../db/connection';
import { logger } from '../../lib/logger';
import { AUTH_ERRORS } from '../../types/errors';
import { incrementCounter, observeHistogram, METRICS } from '../../lib/metrics';

const app = new Hono();

/**
 * POST /auth/register
 * 
 * Register a new user with email and password
 * 
 * Request Body:
 * {
 *   email: string (email format),
 *   password: string (min 8 chars)
 * }
 * 
 * Response:
 * {
 *   accessToken: string (JWT, 15m TTL),
 *   accessExpiresAt: string (ISO 8601),
 *   refreshToken: string (opaque token, 24h TTL),
 *   refreshExpiresAt: string (ISO 8601),
 *   user: { id, email, displayName }
 * }
 * 
 * Error Codes:
 * - AUTH_USER_ALREADY_EXISTS: Email already registered (409)
 * - AUTH_REGISTRATION_FAILED: User creation failed (500)
 */
app.post('/', async (c) => {
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();
  const start = Date.now();
  incrementCounter(METRICS.authSignInAttempts); // registration counts as attempt

  try {
    // Validate request
    const body = await c.req.json();
    const validationResult = RegisterRequestSchema.safeParse(body);

    if (!validationResult.success) {
      logger.error({
        requestId,
        errors: validationResult.error.issues,
        msg: 'Registration request validation failed'
      });

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

    // Initialize service
    const env = c.env as any;
    const db = getDb(env.DATABASE_URL);
    const authService = new AuthService(db);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users: any, { eq }: any) => eq(users.email, email)
    });

    if (existingUser) {
      const errorDef = AUTH_ERRORS.USER_ALREADY_EXISTS;
      logger.error({
        requestId,
        email,
        msg: 'Registration attempt with existing email',
        code: errorDef!.code
      });

      return c.json({
        error: {
          code: errorDef!.code,
          message: errorDef!.message,
          severity: errorDef!.severity,
          retryPolicy: errorDef!.retryPolicy,
          hint: errorDef!.hint,
          requestId,
          timestamp: new Date().toISOString()
        }
      }, 409);
    }

    // Register user
    const user = await authService.registerEmailPassword({
      email,
      password,
      requestId
    });

    // Create session
    const tokens = await authService.createSession({
      userId: user.id,
      requestId
    });

    // Build response
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

    // Validate response shape
    const responseValidation = AuthResponseSchema.safeParse(response);
    if (!responseValidation.success) {
      logger.error({
        requestId,
        userId: user.id,
        errors: responseValidation.error.issues,
        msg: 'Response validation failed'
      });
      throw new Error('AUTH_REGISTRATION_FAILED');
    }

    incrementCounter(METRICS.authSignInSuccess);
    observeHistogram(METRICS.authLatencyMs, (Date.now() - start) / 1000);
    logger.info({
      requestId,
      userId: user.id,
      email,
      msg: 'User registered successfully'
    });

    return c.json(response, 201);

  } catch (error: any) {
    observeHistogram(METRICS.authLatencyMs, (Date.now() - start) / 1000);
    logger.error({
      requestId,
      error: error.message,
      stack: error.stack,
      msg: 'Registration failed'
    });

    // Map known errors
    if (error.message === 'AUTH_USER_ALREADY_EXISTS') {
      const errorDef = AUTH_ERRORS.USER_ALREADY_EXISTS!;
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
      }, 409);
    }

    if (error.message === 'AUTH_REGISTRATION_FAILED') {
      const errorDef = AUTH_ERRORS.REGISTRATION_FAILED!;
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
      }, 500);
    }

    // Generic error
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
