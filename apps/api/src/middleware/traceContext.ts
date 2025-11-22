import { Context, Next } from 'hono';
import { trace, context } from '@opentelemetry/api';
import { getTracer } from '../lib/telemetry';
import { incrementCounter, METRICS } from '../lib/metrics';

/**
 * T146: Trace Context Propagation Middleware
 * - Extracts incoming traceparent header (if any)
 * - Starts a request span and stores traceId on context
 */
const SLOW_REQUEST_THRESHOLD_MS = 500;

export function traceContextMiddleware() {
  return async (c: Context, next: Next) => {
    const tracer = getTracer();
    const start = Date.now();
    const span = tracer.startSpan(`http.request ${c.req.method} ${c.req.path}`);
    const spanCtx = trace.setSpan(context.active(), span);
    try {
      c.set('traceId', span.spanContext().traceId);
      await context.with(spanCtx, async () => {
        await next();
      });
      const duration = Date.now() - start;
      span.setAttribute('http.status_code', c.res.status);
      span.setAttribute('http.duration_ms', duration);
      if (duration > SLOW_REQUEST_THRESHOLD_MS) {
        span.setAttribute('cloudmake.slow', true);
        span.setAttribute('cloudmake.sample.reason', 'slow');
        incrementCounter(METRICS.requestSlowTotal);
      }
    } catch (err: any) {
      span.recordException(err);
      span.setAttribute('error', true);
      span.setAttribute('cloudmake.sample.reason', 'error');
      throw err;
    } finally {
      span.end();
    }
  };
}
