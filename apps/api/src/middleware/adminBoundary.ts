import type { Context, Next } from 'hono';
import { db } from '../../db/connection';
import { adminSessions, users } from '../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Admin Boundary Middleware
 * Enforces token type isolation (SC-019, SC-020, FR-018)
 */
export const adminBoundary = async (c: Context, next: Next): Promise<Response | void> => {
  const tokenType = c.get('tokenType');
  const userId = c.get('userId');

  if (tokenType !== 'admin') {
    return c.json({
      error: {
        code: 'AUTH_ADMIN_BOUNDARY_VIOLATION',
        message: 'Admin token required for this endpoint',
        severity: 'error',
        retryPolicy: 'none',
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
        context: { tokenType, expectedType: 'admin' },
        hint: 'Authenticate via /admin/auth/login to obtain admin token',
      },
    }, 403);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { authRole: true },
  });
  if (!user || user.authRole !== 'admin') {
    return c.json({
      error: {
        code: 'AUTH_ROLE_INSUFFICIENT',
        message: 'Admin role required',
        severity: 'error',
        retryPolicy: 'none',
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
        context: { userId, role: user?.authRole || null },
      },
    }, 403);
  }

  const session = await db.query.adminSessions.findFirst({
    where: eq(adminSessions.userId, userId),
    columns: { id: true, expiresAt: true },
  });
  if (!session) {
    return c.json({
      error: {
        code: 'AUTH_SESSION_NOT_FOUND',
        message: 'No active admin session',
        severity: 'error',
        retryPolicy: 'none',
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
        context: { userId },
        hint: 'Session may have expired or been revoked',
      },
    }, 401);
  }
  if (new Date() > session.expiresAt) {
    return c.json({
      error: {
        code: 'AUTH_SESSION_EXPIRED',
        message: 'Admin session expired',
        severity: 'error',
        retryPolicy: 'none',
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
        context: { sessionId: session.id, expiresAt: session.expiresAt },
        hint: 'Refresh session or re-authenticate',
      },
    }, 401);
  }

  await next();
};
