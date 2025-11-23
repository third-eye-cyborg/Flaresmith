import type { Context, Next } from 'hono';
import { initializeAnalytics, trackApiRequest, trackError } from '@flaresmith/utils';

let analyticsInitialized = false;

/**
 * PostHog Analytics Middleware for Hono API
 * 
 * Initializes PostHog on first request and tracks all API requests.
 * Captures request method, path, status, duration, and errors.
 */
export async function analyticsMiddleware(c: Context, next: Next) {
  // Initialize PostHog on first request
  if (!analyticsInitialized) {
    try {
      const apiKey = c.env?.POSTHOG_API_KEY;
      const host = c.env?.POSTHOG_HOST || 'https://app.posthog.com';

      if (apiKey) {
        await initializeAnalytics({
          apiKey,
          host,
          platform: 'node',
          flushAt: 20,
          flushInterval: 10000,
        });
        analyticsInitialized = true;
        console.log('PostHog analytics initialized for API');
      } else {
        console.warn('PostHog API key not configured for API');
      }
    } catch (error) {
      console.error('Failed to initialize PostHog:', error);
    }
  }

  const startTime = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  try {
    await next();

    // Track successful request
    const durationMs = Date.now() - startTime;
    const statusCode = c.res.status;
    const userId = c.get('userId'); // Assumes auth middleware sets this

    trackApiRequest({
      userId,
      method,
      path,
      statusCode,
      durationMs,
      environment: (c.env?.ENVIRONMENT as 'dev' | 'staging' | 'prod') || 'dev',
      platform: 'api',
    });
  } catch (error) {
    // Track error
    const durationMs = Date.now() - startTime;
    const userId = c.get('userId');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    trackApiRequest({
      userId,
      method,
      path,
      statusCode: 500,
      durationMs,
      errorMessage,
      environment: (c.env?.ENVIRONMENT as 'dev' | 'staging' | 'prod') || 'dev',
      platform: 'api',
    });

    trackError({
      userId,
      errorCode: 'API_REQUEST_ERROR',
      errorMessage,
      severity: 'error',
      stackTrace: error instanceof Error ? error.stack : undefined,
      context: { method, path, durationMs } as Record<string, unknown>,
      environment: (c.env?.ENVIRONMENT as 'dev' | 'staging' | 'prod') || 'dev',
      platform: 'api',
    });

    throw error;
  }
}

/**
 * Analytics helper for custom event tracking in API routes
 */
export function getAnalyticsContext(c: Context) {
  return {
    userId: c.get('userId'),
    environment: (c.env?.ENVIRONMENT as 'dev' | 'staging' | 'prod') || 'dev',
    platform: 'api' as const,
  };
}
