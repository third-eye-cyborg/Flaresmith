import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';
import { rateLimitMiddleware } from '../../src/middleware/rateLimit';
import { _internalMetrics, METRICS } from '../../src/lib/metrics';

/**
 * T167: Rate Limit Overhead Performance Test
 * Validates SC-010: p95 overhead of rate limiting middleware < 5ms.
 */

describe('rateLimitMiddleware overhead (SC-010)', () => {
  const ITERATIONS = 100; // sample size kept below user bucket capacity (120) to avoid 429s
  const P95_TARGET_MS = 5; // success criteria threshold
  let app: Hono;

  beforeAll(() => {
    app = new Hono();
    // Inject userId for middleware (cast to any to bypass Context key typing in test scope)
    app.use('*', async (c, next) => { (c as any).set('userId', 'perf-user'); await next(); });
    app.use('*', rateLimitMiddleware());
    app.get('/ping', (c) => c.text('ok'));
  });

  it('collects overhead samples via histogram', async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const res = await app.request('/ping');
      expect(res.status).toBe(200);
    }
    const hist = _internalMetrics.histograms[METRICS.rateLimitOverheadMs];
    expect(hist).toBeDefined();
    expect(hist!.count).toBeGreaterThanOrEqual(ITERATIONS);
  });

  it('p95 overhead < target', () => {
    const hist = _internalMetrics.histograms[METRICS.rateLimitOverheadMs];
    if (!hist) throw new Error('Histogram not initialized');
    const samples = hist.samples.slice();
    samples.sort((a,b)=>a-b);
    const p95Index = Math.floor(samples.length * 0.95) - 1;
    if (samples.length === 0) throw new Error('No histogram samples collected');
    const p95 = samples[Math.max(0, p95Index)] ?? 0;
    // Log helpful diagnostic if failing
    if (p95 > P95_TARGET_MS) {
      console.warn('Rate limit overhead p95 exceeded target', { p95, target: P95_TARGET_MS, max: Math.max(...samples), avg: hist.sum / hist.count });
    }
    expect(p95).toBeLessThanOrEqual(P95_TARGET_MS);
  });
});
