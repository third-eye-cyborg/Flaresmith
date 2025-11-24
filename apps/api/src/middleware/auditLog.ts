import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { getDb } from "../../db/connection";
import { adminAuditLogs } from "../../db/schema";

/**
 * T031: auditLog middleware
 * Captures admin actions with contextual metadata (FR-016 / SC-006).
 * Usage: wrap protected admin route; supply c.set('audit', { actionType, entityType, entityId, changes }) before next() or via route handler.
 */
export function auditLogMiddleware() {
  return async (c: Context, next: Next) => {
    const role = c.get("role");
    const userId = c.get("userId");
    if (role !== "admin") {
      // Non-admins bypass logging
      return next();
    }

    const before = Date.now();
    await next();
    const after = Date.now();

    const audit = c.get("audit");
    if (!audit) return; // Nothing to log

    if (!c.env.DATABASE_URL) {
      // If DB not available skip silently (early bootstrap) to avoid throwing in worker cold start.
      return;
    }

    try {
      const db = getDb(c.env.DATABASE_URL);
      await db.insert(adminAuditLogs).values({
        adminUserId: userId,
        actionType: audit.actionType,
        entityType: audit.entityType,
        entityId: audit.entityId,
        changesJson: audit.changes ?? null,
        ipAddress: c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || undefined,
      });
      const logger: any = c.get("logger");
      logger?.info({ actionType: audit.actionType, durationMs: after - before }, "Admin action logged");
    } catch {
      throw new HTTPException(500, { message: "Failed to persist audit log" });
    }
  };
}
