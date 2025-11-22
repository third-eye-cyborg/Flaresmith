import { context, trace, SpanStatusCode, propagation } from '@opentelemetry/api';

/**
 * T145: Telemetry Base Module
 * Lightweight tracer acquisition; actual SDK/exporter initialization deferred.
 */

const SERVICE_NAME = 'cloudmake-api';

export function getTracer() {
  return trace.getTracer(SERVICE_NAME);
}

export interface SpanOptions {
  attributes?: Record<string, any>;
}

export async function withSpan<T>(name: string, opts: SpanOptions, fn: () => Promise<T>): Promise<T> {
  const tracer = getTracer();
  const span = tracer.startSpan(name, undefined, context.active());
  try {
    if (opts.attributes) Object.entries(opts.attributes).forEach(([k, v]) => span.setAttribute(k, v as any));
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err: any) {
    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR, message: err?.message });
    throw err;
  } finally {
    span.end();
  }
}

export function extractTraceParent(headers: Record<string, string | string[] | undefined>) {
  const traceparent = headers['traceparent'];
  if (!traceparent) return;
  // Propagation handled automatically if SDK active; placeholder for future.
}

export function currentTraceId(): string | undefined {
  const span = trace.getSpan(context.active());
  return span?.spanContext().traceId;
}
