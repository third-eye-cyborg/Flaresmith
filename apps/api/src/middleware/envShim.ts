import type { Context, Next } from "hono";

/**
 * Env Shim Middleware (DEPRECATED)
 * Temporary compatibility layer that assigns request-scoped bindings onto a global object.
 * New code SHOULD inject `c.env` directly into services (see ProjectService/PreviewService constructors).
 * This shim will be removed once all `__CLOUDMAKE_ENV` references are refactored.
 */
export function envShim() {
  return async (c: Context, next: Next) => {
    // DEPRECATED: Assign per-request env bindings to a global shim for legacy code paths.
    // Prefer passing `c.env` explicitly to service constructors.
    (globalThis as any).__CLOUDMAKE_ENV = c.env;
    await next();
  };
}

// Deprecated type placeholder intentionally removed.
