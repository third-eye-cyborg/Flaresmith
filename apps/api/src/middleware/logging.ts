import type { Context, Next } from "hono";
import pino from "pino";
import { v4 as uuidv4 } from "uuid";
import { redactLogPayload } from "../lib/loggerRedaction";

/**
 * T024: Structured Logging Middleware
 * Implements Pino-based structured logging with secret redaction
 */

const logger = pino({
  level: "info", // Default level, will be overridden from context
  redact: {
    paths: [
      "*.password",
      "*.token",
      "*.secret",
      "*.apiKey",
      "*.authorization",
      "req.headers.authorization",
      "res.headers['set-cookie']",
    ],
    censor: "[REDACTED]",
  },
  formatters: {
    // Apply deep redaction on every log object (message, merged bindings)
    log(obj) {
      return redactLogPayload(obj) as typeof obj;
    },
  },
});

export function structuredLogger() {
  return async (c: Context, next: Next) => {
    const requestId = c.req.header("X-Request-ID") || uuidv4();
    const startTime = Date.now();

    c.set("requestId", requestId);
    c.set("logger", logger);

    logger.info(
      {
        requestId,
        method: c.req.method,
        path: c.req.path,
        userAgent: c.req.header("user-agent"),
      },
      "Incoming request"
    );

    await next();

    const duration = Date.now() - startTime;
    logger.info(
      {
        requestId,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: duration,
      },
      "Request completed"
    );
  };
}

export { logger };
