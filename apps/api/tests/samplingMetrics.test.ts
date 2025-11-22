import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { traceContextMiddleware } from '../src/middleware/traceContext';
import { errorHandler } from '../src/middleware/errorHandler';
import { getMetricsSnapshot, METRICS } from '../src/lib/metrics';

function createTestApp() {
  const app = new Hono();
  app.use('*', traceContextMiddleware());
  app.get('/slow', async (c) => {
    // Simulate slow path > 500ms threshold
    await new Promise(r => setTimeout(r, 550));
    return c.json({ ok: true });
  });
  app.get('/error', () => {
    throw new Error('INTERNAL_UNEXPECTED synthetic');
  });
  app.onError(errorHandler);
  return app;
}

describe('sampling metrics', () => {
  it('increments slow request counter for /slow', async () => {
    const before = getMetricsSnapshot();
    const app = createTestApp();
    const res = await app.request('/slow');
    expect(res.status).toBe(200);
    const after = getMetricsSnapshot();
    expect((after.counters[METRICS.requestSlowTotal] || 0)).toBe((before.counters[METRICS.requestSlowTotal] || 0) + 1);
  });

  it('increments error counters for /error', async () => {
    const before = getMetricsSnapshot();
    const app = createTestApp();
    const res = await app.request('/error');
    expect(res.status).toBe(500);
    const after = getMetricsSnapshot();
    expect((after.counters[METRICS.errorTotal] || 0)).toBe((before.counters[METRICS.errorTotal] || 0) + 1);
    expect((after.counters[METRICS.errorSampledTotal] || 0)).toBe((before.counters[METRICS.errorSampledTotal] || 0) + 1);
  });
});
