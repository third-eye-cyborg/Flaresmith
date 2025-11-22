import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * T025: Error Handling Middleware
 * Implements standardized error responses with proper severity and retry policies
 */

export interface CloudMakeError {
  code: string;
  message: string;
  severity: "info" | "warning" | "error" | "critical";
  retryPolicy: "none" | "linear" | "exponential";
  requestId?: string;
  timestamp: string;
  context?: Record<string, unknown>;
  hint?: string;
  causeChain?: string[];
}

export function errorHandler(err: Error, c: Context) {
  const requestId = c.get("requestId") || "unknown";
  const logger = c.get("logger");

  // Handle Hono HTTP exceptions
  if (err instanceof HTTPException) {
    const status = err.status;
    const errorResponse: CloudMakeError = {
      code: `HTTP_${status}`,
      message: err.message,
      severity: status >= 500 ? "error" : "warning",
      retryPolicy: status >= 500 ? "exponential" : "none",
      requestId,
      timestamp: new Date().toISOString(),
    };

    logger?.error({ error: errorResponse }, "HTTP exception");
    return c.json({ error: errorResponse }, status);
  }

  // Handle validation errors (Zod)
  if (err.name === "ZodError") {
    const errorResponse: CloudMakeError = {
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      severity: "warning",
      retryPolicy: "none",
      requestId,
      timestamp: new Date().toISOString(),
      context: { issues: (err as any).issues },
      hint: "Check the request payload against the API schema",
    };

    logger?.warn({ error: errorResponse }, "Validation error");
    return c.json({ error: errorResponse }, 400);
  }

  // Handle database errors
  if (err.message.includes("ECONNREFUSED") || err.message.includes("database")) {
    const errorResponse: CloudMakeError = {
      code: "DATABASE_UNAVAILABLE",
      message: "Database connection failed",
      severity: "critical",
      retryPolicy: "exponential",
      requestId,
      timestamp: new Date().toISOString(),
      hint: "The database service may be temporarily unavailable. Please retry.",
    };

    logger?.error({ error: errorResponse, originalError: err }, "Database error");
    return c.json({ error: errorResponse }, 503);
  }

  // Generic internal server error
  const errorResponse: CloudMakeError = {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    severity: "error",
    retryPolicy: "exponential",
    requestId,
    timestamp: new Date().toISOString(),
  };

  logger?.error({ error: errorResponse, originalError: err }, "Unhandled error");
  return c.json({ error: errorResponse }, 500);
}
