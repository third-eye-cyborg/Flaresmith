import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { z } from 'zod';
import { traceContextMiddleware } from '../src/middleware/traceContext';
import { errorHandler } from '../src/middleware/errorHandler';

// Minimal app for testing error envelope traceId inclusion
function createTestApp() {
  const app = new Hono();
  app.use('*', traceContextMiddleware());
  app.post('/validate', async (c) => {
    const schema = z.object({ name: z.string() });
    const body = await c.req.json();
    schema.parse(body); // Will throw ZodError if invalid
    return c.json({ ok: true });
  });
  app.onError(errorHandler);
  return app;
}

describe('errorHandler traceId inclusion', () => {
  it('includes traceId in validation error response context', async () => {
    const app = createTestApp();
    const res = await app.request('/validate', { method: 'POST', body: JSON.stringify({}) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.context).toBeDefined();
    expect(json.error.context.traceId).toMatch(/^[a-f0-9]{32}$/i);
    expect(json.error.context.category).toBe('validation');
  });
});
