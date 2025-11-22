import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { errorHandler } from "./middleware/errorHandler";
import { structuredLogger } from "./middleware/logging";
import { authMiddleware } from "./middleware/auth";
import { idempotencyMiddleware } from "./middleware/idempotency";
import { rateLimitMiddleware } from "./middleware/rateLimit";

/**
 * T023: Hono App Initialization
 * Sets up middleware pipeline and route structure
 */

export type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  GITHUB_TOKEN: string;
  CLOUDFLARE_API_TOKEN: string;
  NEON_API_KEY: string;
  POSTMAN_API_KEY: string;
  ENVIRONMENT: "development" | "staging" | "production";
};

const app = new Hono<{ Bindings: Bindings }>();

// Core middleware pipeline
app.use("*", cors());
app.use("*", prettyJSON());
app.use("*", logger());
app.use("*", structuredLogger());

// Health check endpoint (no auth required)
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

// Protected routes with auth + idempotency + rate limiting
app.use("/api/*", authMiddleware());
app.use("/api/*", rateLimitMiddleware());
app.use("/api/projects/*", idempotencyMiddleware(["POST", "PUT", "DELETE"]));
app.use("/api/environments/*", idempotencyMiddleware(["POST", "PUT", "DELETE"]));

// Route imports
import projectsRouter from "./routes/projects";

// Mount routes
app.route("/api/projects", projectsRouter);
// app.route("/api/environments", environmentsRouter);
// app.route("/api/specs", specsRouter);
// app.route("/api/chat", chatRouter);

// Global error handler (must be last)
app.onError(errorHandler);

export default app;
