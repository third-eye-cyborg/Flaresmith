import { Context, Next } from "hono";
import pino from "pino";
import { v4 as uuidv4 } from "uuid";

/**
 * T024: Structured Logging Middleware
 * Implements Pino-based structured logging with secret redaction
 */

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
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
});

export function structuredLogger() {
  return async (c: Context, next: Next) => {
    const requestId = c.req.header("X-Request-ID") || uuidv4();
    const startTime = Date.now();

    c.set("requestId", requestId);
    c.set("logger", logger);

    logger.info({
      requestId,
      method: c.req.method,
      path: c.req.path,
      userAgent: c.req.header("user-agent"),
    }, "Incoming request");

    await next();

    const duration = Date.now() - startTime;
    logger.info({
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: duration,
    }, "Request completed");
  };
}

export { logger };
