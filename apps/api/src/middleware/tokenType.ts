import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";

/**
 * T029: tokenType middleware
 * Enforces distinct admin vs user token usage per FR-006 / FR-007 / SC-010.
 * Rules:
 *  - /admin/* routes require token claim type=admin
 *  - Non-/admin routes require token claim type=user
 *  - Cross-boundary usage returns 403 before business logic
 */
export function tokenTypeMiddleware() {
  return async (c: Context, next: Next) => {
    const path = c.req.path;
    const isAdminRoute = path.startsWith("/admin/");

    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "Missing or invalid authorization header" });
    }
    const token = authHeader.substring(7);
    const secret = c.env.JWT_SIGNING_KEY;
    if (!secret) {
      throw new HTTPException(500, { message: "JWT signing key not configured" });
    }

    let payload: Record<string, unknown>;
    try {
      payload = await verify(token, secret);
    } catch {
      throw new HTTPException(401, { message: "Invalid or expired token" });
    }

    const tokenType = payload.type as string | undefined;
    if (!tokenType) {
      throw new HTTPException(403, { message: "Token missing type claim" });
    }

    if (isAdminRoute && tokenType !== "admin") {
      throw new HTTPException(403, { message: "Invalid token type for admin route" });
    }
    if (!isAdminRoute && tokenType !== "user") {
      // Spec: admin token presented to user app treated as unauthenticated → 403
      throw new HTTPException(403, { message: "Invalid token type for user route" });
    }

    // Set contextual values for downstream middleware/services
    c.set("tokenType", tokenType);
    if (payload.sub) c.set("userId", payload.sub as string);
    await next();
  };
}
