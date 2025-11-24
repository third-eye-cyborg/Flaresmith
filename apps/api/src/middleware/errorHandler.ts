import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { currentTraceId } from "../lib/telemetry";
import { incrementCounter, METRICS } from "../lib/metrics";

/**
 * T025 + T127: Error Handling Middleware
 * 
 * Implements comprehensive error handling with:
 * - Standardized error envelope (code, message, severity, retryPolicy, requestId, timestamp, context, hint, causeChain)
 * - Error taxonomy by category (ENV, INTEGRATION, AUTH, RATE_LIMIT, SPEC, CHAT, INTERNAL)
 * - Security: No stack traces or internal errors exposed
 * - User-friendly hints and actionable messages
 */

export interface CloudMakeError {
  code: string;
  message: string;
  severity: "info" | "warning" | "error" | "critical";
  retryPolicy: "none" | "safe" | "idempotent";
  requestId?: string;
  timestamp: string;
  context?: Record<string, unknown>;
  hint?: string;
  causeChain?: string[];
  details?: Record<string, unknown>;
}

function classify(code: string): string {
  if (code.startsWith('ENV_')) return 'environment';
  if (code.startsWith('INTEGRATION_')) return 'integration';
  if (code.startsWith('AUTH_')) return 'auth';
  if (code.startsWith('RATE_LIMIT_')) return 'rate-limit';
  if (code.startsWith('SPEC_')) return 'spec';
  if (code.startsWith('CHAT_')) return 'chat';
  if (code.startsWith('DATABASE_')) return 'database';
  if (code.startsWith('VALIDATION_')) return 'validation';
  return 'internal';
}

export function errorHandler(err: Error, c: Context) {
  const requestId = c.get("requestId") || "unknown";
  const traceId = c.get("traceId") || currentTraceId() || "unknown";
  const logger = c.get("logger");

  // Error sampling: all errors counted; high-severity errors flagged as sampled

  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    const status = err.status;
    
    let errorCode = `HTTP_${status}`;
    let hint: string | undefined;
    
    // Provide specific codes and hints for common HTTP statuses
    if (status === 401) {
      errorCode = 'AUTH_UNAUTHORIZED';
      hint = 'Provide a valid authentication token in the Authorization header';
    } else if (status === 403) {
      errorCode = 'AUTH_ROLE_DENIED';
      hint = 'Your role does not have permission to access this resource';
    } else if (status === 404) {
      errorCode = 'RESOURCE_NOT_FOUND';
      hint = 'Check the resource ID and endpoint path';
    } else if (status === 429) {
      errorCode = 'RATE_LIMIT_EXCEEDED';
      hint = 'Too many requests. Check Retry-After header for wait time';
    }
    
    incrementCounter(METRICS.errorTotal);
    incrementCounter(METRICS.errorSampledTotal); // sample all HTTP exceptions for now
    const errorResponse: CloudMakeError = {
      code: errorCode,
      message: err.message,
      severity: status >= 500 ? "error" : "warning",
      retryPolicy: status >= 500 ? "safe" : "none",
      requestId,
      timestamp: new Date().toISOString(),
      hint,
      context: { traceId, category: classify(errorCode) },
    };

    logger?.error({ error: errorResponse }, "HTTP exception");
    return c.json({ error: errorResponse }, status);
  }

  // Handle validation errors (Zod)
  if (err.name === "ZodError") {
    incrementCounter(METRICS.errorTotal);
    incrementCounter(METRICS.errorSampledTotal);
    const errorResponse: CloudMakeError = {
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      severity: "warning",
      retryPolicy: "none",
      requestId,
      timestamp: new Date().toISOString(),
      details: { issues: (err as any).issues },
      hint: "Check the request payload against the API schema",
      context: { traceId, category: classify("VALIDATION_ERROR") },
    };

    logger?.warn({ error: errorResponse }, "Validation error");
    return c.json({ error: errorResponse }, 400);
  }

  // Handle environment errors
  if (err.message.includes('ENV_PREVIEW_EXPIRED')) {
    incrementCounter(METRICS.errorTotal);
    incrementCounter(METRICS.errorSampledTotal);
    const errorResponse: CloudMakeError = {
      code: 'ENV_PREVIEW_EXPIRED',
      message: 'Preview environment has expired',
      severity: 'error',
      retryPolicy: 'none',
      requestId,
      timestamp: new Date().toISOString(),
      hint: 'Push a new commit to recreate the preview environment',
      context: { traceId, category: classify('ENV_PREVIEW_EXPIRED') },
    };

    logger?.info({ error: errorResponse }, 'Preview expired');
    return c.json({ error: errorResponse }, 410);
  }

  if (err.message.includes('ENV_PREVIEW_LIMIT_REACHED')) {
    incrementCounter(METRICS.errorTotal);
    incrementCounter(METRICS.errorSampledTotal);
    const errorResponse: CloudMakeError = {
      code: 'ENV_PREVIEW_LIMIT_REACHED',
      message: 'Maximum preview environments (15) reached',
      severity: 'error',
      retryPolicy: 'none',
      requestId,
      timestamp: new Date().toISOString(),
      hint: 'Archive existing preview environments to create new ones',
      context: { traceId, category: classify('ENV_PREVIEW_LIMIT_REACHED') },
    };

    logger?.warn({ error: errorResponse }, 'Preview limit reached');
    return c.json({ error: errorResponse }, 409);
  }

  // Handle integration errors
  if (err.message.includes('INTEGRATION_')) {
    const provider = err.message.match(/INTEGRATION_(\w+)_/)?.[1] || 'UNKNOWN';
    incrementCounter(METRICS.errorTotal);
    incrementCounter(METRICS.errorSampledTotal);
    const errorResponse: CloudMakeError = {
      code: err.message.split(':')[0] || 'INTEGRATION_ERROR',
      message: `Integration with ${provider} failed`,
      severity: 'error',
      retryPolicy: 'idempotent',
      requestId,
      timestamp: new Date().toISOString(),
      hint: `The ${provider} service may be temporarily unavailable. Check status page or retry later`,
      context: { traceId, category: classify(err.message.split(':')[0] || 'INTEGRATION_ERROR') },
    };

    logger?.error({ error: errorResponse, originalError: err }, 'Integration error');
    return c.json({ error: errorResponse }, 503);
  }

  // Handle spec drift conflicts
  if (err.message.includes('SPEC_DRIFT_CONFLICT')) {
    incrementCounter(METRICS.errorTotal);
    incrementCounter(METRICS.errorSampledTotal);
    const errorResponse: CloudMakeError = {
      code: 'SPEC_DRIFT_CONFLICT',
      message: 'Spec changes conflict with uncommitted local changes',
      severity: 'warning',
      retryPolicy: 'none',
      requestId,
      timestamp: new Date().toISOString(),
      hint: 'Commit or stash local changes before applying spec updates',
      context: { traceId, category: classify('SPEC_DRIFT_CONFLICT') },
    };

    logger?.warn({ error: errorResponse }, 'Spec drift conflict');
    return c.json({ error: errorResponse }, 409);
  }

  // Handle chat diff conflicts
  if (err.message.includes('CHAT_DIFF_OUTDATED_BASE')) {
    incrementCounter(METRICS.errorTotal);
    incrementCounter(METRICS.errorSampledTotal);
    const errorResponse: CloudMakeError = {
      code: 'CHAT_DIFF_OUTDATED_BASE',
      message: 'The file has been modified since this diff was generated',
      severity: 'warning',
      retryPolicy: 'none',
      requestId,
      timestamp: new Date().toISOString(),
      hint: 'Refresh the file and regenerate the diff with the latest version',
      context: { traceId, category: classify('CHAT_DIFF_OUTDATED_BASE') },
    };

    logger?.warn({ error: errorResponse }, 'Chat diff outdated');
    return c.json({ error: errorResponse }, 409);
  }

  // Handle database errors
  if (err.message.includes("ECONNREFUSED") || err.message.includes("database")) {
    incrementCounter(METRICS.errorTotal);
    incrementCounter(METRICS.errorSampledTotal);
    const errorResponse: CloudMakeError = {
      code: "DATABASE_UNAVAILABLE",
      message: "Database connection failed",
      severity: "critical",
      retryPolicy: "safe",
      requestId,
      timestamp: new Date().toISOString(),
      hint: "The database service may be temporarily unavailable. Please retry.",
      context: { traceId, category: classify('DATABASE_UNAVAILABLE') },
    };

    logger?.error({ error: errorResponse, originalError: err }, "Database error");
    return c.json({ error: errorResponse }, 503);
  }

  // Handle idempotency conflicts
  if (err.message.includes('IDEMPOTENCY_MISMATCH')) {
    const errorResponse: CloudMakeError = {
      code: 'IDEMPOTENCY_MISMATCH',
      message: 'Idempotency key conflict - request body differs from original',
      severity: 'warning',
      retryPolicy: 'none',
      requestId,
      timestamp: new Date().toISOString(),
      hint: 'Use a different idempotency key or retry with the same request body',
      context: { traceId, category: classify('IDEMPOTENCY_MISMATCH') },
    };

    logger?.warn({ error: errorResponse }, 'Idempotency mismatch');
    return c.json({ error: errorResponse }, 422);
  }

  // Generic internal server error
  // IMPORTANT: Do not expose stack traces or internal error details
  incrementCounter(METRICS.errorTotal);
  incrementCounter(METRICS.errorSampledTotal);
  const errorResponse: CloudMakeError = {
    code: "INTERNAL_UNEXPECTED",
    message: "An unexpected error occurred",
    severity: "error",
    retryPolicy: "safe",
    requestId,
    timestamp: new Date().toISOString(),
    hint: "Please contact support if this error persists",
    context: { traceId, category: classify('INTERNAL_UNEXPECTED') },
  };

  // Log full error details internally but don't expose to client
  // Sampling attributes would be added to active span if tracer SDK active (handled elsewhere)
  logger?.error({ 
    error: errorResponse, 
    originalError: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    }
  }, "Unhandled error");
  
  return c.json({ error: errorResponse }, 500);
}
