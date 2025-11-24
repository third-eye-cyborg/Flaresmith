// Design Sync Access Control Middleware (T040)
// Enforces role matrix for design sync endpoints.
// Roles: admin, maintainer, developer, viewer
// Permissions:
// - admin|maintainer: full access
// - developer: can read drift, coverage, sync status and initiate sync operations (POST /design-sync/operations)
// - viewer: read-only (GET drift, coverage, operations listing)
// Responds with 403 JSON error envelope if access denied.

import type { Context, Next } from 'hono';

// Simplified role extraction - in real code integrate with auth middleware / JWT claims
function extractRole(c: Context): string {
  // Example precedence: header > context variable > default
  const fromHeader = c.req.header('x-user-role');
  if (fromHeader) return fromHeader.toLowerCase();
  const ctxRole = c.get('userRole');
  if (typeof ctxRole === 'string') return ctxRole.toLowerCase();
  return 'viewer';
}

// Determine if method+path is write operation
function isWriteOperation(c: Context): boolean {
  const m = c.req.method.toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return false;
  return true;
}

// Determine if path is restricted for developer (non-read or undo/override etc.)
function isDeveloperAllowed(c: Context): boolean {
  const path = c.req.path;
  const method = c.req.method.toUpperCase();
  // Developer allowed writes only for sync operations initiation
  if (method === 'POST' && /\/design-sync\/operations$/.test(path)) return true;
  // Read endpoints allowed
  if (method === 'GET') return true;
  return false;
}

export async function designSyncAccess(c: Context, next: Next) {
  const role = extractRole(c);
  const write = isWriteOperation(c);

  let allowed = false;
  if (role === 'admin' || role === 'maintainer') {
    allowed = true;
  } else if (role === 'developer') {
    allowed = write ? isDeveloperAllowed(c) : true;
  } else if (role === 'viewer') {
    allowed = !write; // read-only
  }

  if (!allowed) {
    return c.json(
      {
        error: {
          code: 'DESIGN_SYNC_ACCESS_DENIED',
          message: 'Access denied for design sync operation.',
          severity: 'error',
          retryPolicy: 'none',
          requestId: c.get('requestId'),
          timestamp: new Date().toISOString(),
          context: { role },
          hint: 'Check your role permissions or request elevated access.',
          causeChain: ['ACCESS_MATRIX_ROLE_MISMATCH'],
        },
      },
      403
    );
  }

  await next();
}
