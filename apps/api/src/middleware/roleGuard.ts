import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { getDb } from "../../db/connection";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";

/**
 * T030: roleGuard middleware
 * Derives authoritative role from database (FR-015) and validates against tokenType claim.
 * Caches role lookups briefly to reduce DB load.
 */

interface CacheEntry { role: string; ts: number }
const ROLE_CACHE = new Map<string, CacheEntry>();
const ROLE_CACHE_TTL_MS = 60_000; // 1 minute

export function roleGuard() {
  return async (c: Context, next: Next) => {
    const userId = c.get("userId");
    const tokenType = c.get("tokenType");
    if (!userId || !tokenType) {
      throw new HTTPException(401, { message: "Missing authentication context" });
    }

    let role: string | undefined;
    const cached = ROLE_CACHE.get(userId);
    const now = Date.now();
    if (cached && now - cached.ts < ROLE_CACHE_TTL_MS) {
      role = cached.role;
    } else if (c.env.DATABASE_URL) {
      try {
        const db = getDb(c.env.DATABASE_URL);
        const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (rows.length === 0) {
          throw new HTTPException(401, { message: "User not found" });
        }
        role = rows[0].role as string;
        ROLE_CACHE.set(userId, { role, ts: now });
      } catch (err) {
        throw new HTTPException(500, { message: "Failed to resolve user role" });
      }
    } else {
      // No DB binding available (early bootstrap); deny to avoid false elevation
      throw new HTTPException(503, { message: "Role resolution unavailable" });
    }

    // Validate role vs token type (admin token must map to admin role, user token to user role)
    if (tokenType === "admin" && role !== "admin") {
      throw new HTTPException(403, { message: "Token type/role mismatch" });
    }
    if (tokenType === "user" && role !== "user") {
      throw new HTTPException(403, { message: "Token type/role mismatch" });
    }

    c.set("role", role);
    await next();
  };
}
