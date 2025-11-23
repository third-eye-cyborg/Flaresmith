/**
 * T017: GET /auth/oauth/callback route
 * OAuth provider callback with PKCE state validation
 * FR-003: Neon Auth Migration - User Story 1
 */

import { Hono } from 'hono';
import { OAuthCallbackQuerySchema, AuthResponseSchema } from '@flaresmith/types';
import { AuthService } from '../../services/auth/authService';
import { AppleOAuthAdapter, GoogleOAuthAdapter, GitHubOAuthAdapter } from '../../services/auth/providers';
import { incrementCounter, observeHistogram, METRICS } from '../../lib/metrics';
import { getDb } from '../../../db/connection';
import { logger } from '../../lib/logger';
import { AUTH_ERRORS } from '../../types/errors';
import { eq } from 'drizzle-orm';
import { oauthState } from '../../../db/schema';

const app = new Hono();

app.get('/', async (c) => {
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();
  const start = Date.now();
  // Count sign-in attempt (OAuth based)
  incrementCounter(METRICS.authSignInAttempts);

  try {
    const query = c.req.query();
    const validationResult = OAuthCallbackQuerySchema.safeParse(query);

    if (!validationResult.success) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid callback parameters',
          details: validationResult.error.issues,
          requestId
        }
      }, 400);
    }

    const { state, code, provider } = validationResult.data;

    const env = c.env as any;
    const db = getDb(env.DATABASE_URL);
    const authService = new AuthService(db);

    // Validate OAuth state (CSRF protection + PKCE)
    const [stateRecord] = await db
      .select()
      .from(oauthState)
      .where(eq(oauthState.state, state))
      .limit(1);

    if (!stateRecord) {
      const errorDef = AUTH_ERRORS.STATE_INVALID!;
      logger.error({
        requestId,
        provider,
        msg: 'OAuth state not found or expired',
        code: errorDef.code
      });

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
      }, 400);
    }

    // Check state expiry
    if (new Date() > stateRecord.expiresAt) {
      const errorDef = AUTH_ERRORS.STATE_INVALID!;
      return c.json({
        error: {
          code: errorDef.code,
          message: 'OAuth state expired',
          hint: 'Please restart the authentication flow',
          requestId,
          timestamp: new Date().toISOString()
        }
      }, 400);
    }

    // Get provider adapter
    let adapter;
    switch (provider) {
      case 'apple':
        adapter = new AppleOAuthAdapter();
        break;
      case 'google':
        adapter = new GoogleOAuthAdapter();
        break;
      case 'github':
        adapter = new GitHubOAuthAdapter();
        break;
      default:
        throw new Error('Invalid provider');
    }

    // Exchange code for tokens
    const providerTokens = await adapter.exchangeCodeForToken(code, stateRecord.codeVerifier);

    // Get user profile
    const profile = await adapter.getUserProfile(providerTokens);

    // Authenticate or create user
    const user = await authService.authenticateProvider({
      provider,
      subject: profile.subject,
      email: profile.email,
      ...(profile.name && { displayName: profile.name }),
      requestId
    });

    // Create session
    const tokens = await authService.createSession({
      userId: user.id,
      requestId
    });

    // Delete used state
    await db.delete(oauthState).where(eq(oauthState.id, stateRecord.id));

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

    // Success metrics
    incrementCounter(METRICS.authSignInSuccess);
    observeHistogram(METRICS.authLatencyMs, (Date.now() - start) / 1000);
    logger.info({
      requestId,
      userId: user.id,
      provider,
      msg: 'OAuth authentication successful'
    });

    return c.json(response, 200);

  } catch (error: any) {
    // Failure latency capture
    observeHistogram(METRICS.authLatencyMs, (Date.now() - start) / 1000);
    logger.error({
      requestId,
      error: error.message,
      msg: 'OAuth callback failed'
    });

    if (error.message.includes('not implemented')) {
      const errorDef = AUTH_ERRORS.PROVIDER_UNAVAILABLE!;
      return c.json({
        error: {
          code: errorDef.code,
          message: 'OAuth provider integration not yet implemented',
          hint: 'This provider will be available in a future release',
          requestId,
          timestamp: new Date().toISOString()
        }
      }, 503);
    }

    return c.json({
      error: {
        code: 'AUTH_PROVIDER_CODE_INVALID',
        message: 'OAuth authentication failed',
        requestId,
        timestamp: new Date().toISOString()
      }
    }, 400);
  }
});

export default app;
