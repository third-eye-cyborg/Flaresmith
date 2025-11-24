import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { createHash } from "node:crypto";
import { getDb } from "../../db/connection";
import { idempotencyKeys } from "../../db/schema/idempotency";
import { eq } from "drizzle-orm";

/**
 * T027-T028: Idempotency Middleware
 * Implements convergent provisioning with deterministic keys
 */

export function idempotencyMiddleware(methods: string[] = ["POST", "PUT", "DELETE"]) {
  return async (c: Context, next: Next) => {
    if (!methods.includes(c.req.method)) {
      await next();
      return;
    }

    const idempotencyKey = c.req.header("Idempotency-Key");
    
    if (!idempotencyKey) {
      throw new HTTPException(400, { 
        message: "Idempotency-Key header required for this operation" 
      });
    }

    const db = getDb(c.env.DATABASE_URL);
    const body = await c.req.json();
    const checksum = createHash("sha256").update(JSON.stringify(body)).digest("hex");

    // Check for existing operation
    const existing = await db
      .select()
      .from(idempotencyKeys)
      .where(eq(idempotencyKeys.key, idempotencyKey))
      .limit(1);

    if (existing.length > 0) {
      const record = existing[0];
      
      // Verify checksum matches (same operation)
      if (record.checksum !== checksum) {
        throw new HTTPException(409, {
          message: "Idempotency key conflict: different request body for same key",
        });
      }

      // Return cached result
      if (record.lastStatus === "success" && record.resourceId) {
        c.set("cachedResourceId", record.resourceId);
        c.set("fromCache", true);
      }
    } else {
      // Store new idempotency record
      await db.insert(idempotencyKeys).values({
        key: idempotencyKey,
        resourceType: c.req.path.split("/")[2], // Extract resource type from path
        lastStatus: "pending",
        checksum,
      });
    }

    c.set("idempotencyKey", idempotencyKey);
    await next();
  };
}
