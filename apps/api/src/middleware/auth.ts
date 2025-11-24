import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";

/**
 * Authentication Middleware
 * Implements JWT-based authentication with session verification
 */

export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7);
    // Use the configured JWT signing key
    const secret = c.env.JWT_SIGNING_KEY;

    if (!secret) {
      throw new HTTPException(500, { message: "JWT signing key not configured" });
    }

    try {
      const payload = await verify(token, secret);
      c.set("userId", payload.sub as string);
      c.set("orgId", payload.orgId as string);
      await next();
    } catch (err) {
      throw new HTTPException(401, { message: "Invalid or expired token" });
    }
  };
}
