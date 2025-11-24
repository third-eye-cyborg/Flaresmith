/**
 * GET /api/rate-limit/status (T112)
 * Provides current user & optional project rate limit status.
 * Response includes remaining tokens, limits, refill rates, and seconds to full bucket.
 */
import { Hono } from 'hono';
import { getRateLimitSnapshot } from '../../middleware/rateLimit';
import { randomUUID } from 'crypto';

const app = new Hono();

app.get('/', (c) => {
  const requestId = randomUUID();
  const userId = c.get('userId') as string | undefined;
  if (!userId) {
    return c.json({
      error: {
        code: 'RATE_LIMIT_STATUS_UNAUTHORIZED',
        message: 'Authentication required',
        severity: 'error',
        retryPolicy: 'none',
        requestId,
        timestamp: new Date().toISOString(),
      }
    }, 401);
  }
  const projectId = c.req.query('projectId');
  const snapshot = getRateLimitSnapshot(userId, projectId);
  return c.json({
    user: snapshot.user,
    project: snapshot.project,
    meta: { requestId, timestamp: new Date().toISOString() }
  });
});

export default app;
