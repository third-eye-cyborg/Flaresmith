// Correlation Middleware for Design Sync (T039)
// Attaches correlationId to request context for downstream logging.
// If a header 'x-correlation-id' is present, uses it; otherwise generates a UUID v4.
// Exposes getCorrelationId(c) utility for handlers & services.

import { v4 as uuidv4 } from 'uuid';
import type { Context, Next } from 'hono';

const HEADER_NAME = 'x-correlation-id';
const KEY = 'designSyncCorrelationId';

export function getCorrelationId(c: Context): string | undefined {
  return c.get(KEY);
}

export async function correlationDesignSync(c: Context, next: Next) {
  let correlationId = c.req.header(HEADER_NAME);
  if (!correlationId || correlationId.trim() === '') {
    correlationId = uuidv4();
  }
  c.set(KEY, correlationId);
  // Propagate header on response for clients to chain
  c.header(HEADER_NAME, correlationId);
  await next();
}
