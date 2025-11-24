import { logger } from './logger';
import { withRedaction } from './loggerRedaction';

// Design Sync Feature-Specific Logger (T038)
// Provides structured logging with consistent fields for observability & correlation.
// All logs include: feature, action, level, timestamp (pino), operationId?, correlationId?, componentCount?, durationMs?, status?, errorCode?
// Usage: designSyncLogger.info({ action: 'executeSync', operationId, correlationId, componentCount, durationMs, status })

type DesignSyncLogPayload = {
  action: string;
  correlationId?: string;
  operationId?: string;
  componentCount?: number;
  durationMs?: number;
  status?: 'started' | 'completed' | 'failed' | 'skipped';
  errorCode?: string;
  hint?: string;
  breadcrumbs?: string[]; // T089: Event breadcrumbs for tracing operation flow
  // Allow arbitrary supplemental fields but keep them JSON-serializable
  [key: string]: unknown;
};

function base(payload: DesignSyncLogPayload) {
  return withRedaction({
    feature: 'designSync',
    ...payload,
  });
}

export const designSyncLogger = {
  info(payload: DesignSyncLogPayload) {
    logger.info(base(payload));
  },
  error(payload: DesignSyncLogPayload & { error?: unknown }) {
    logger.error(base(payload));
  },
};

// Helper timers for measuring durationMs
export function timeSyncOperation<T>(
  details: Omit<DesignSyncLogPayload, 'status' | 'durationMs'>,
  fn: () => Promise<T> | T
): Promise<T> {
  const start = performance.now();
  designSyncLogger.info({ ...details, status: 'started' });
  try {
    const result = fn();
    return Promise.resolve(result).then((val) => {
      const durationMs = Math.round(performance.now() - start);
      designSyncLogger.info({ ...details, status: 'completed', durationMs });
      return val;
    });
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    designSyncLogger.error({ ...details, status: 'failed', durationMs, errorCode: err?.code, error: err });
    throw err;
  }
}
