import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { errorHandler } from "./middleware/errorHandler";
import { structuredLogger } from "./middleware/logging";
import { authMiddleware } from "./middleware/auth";
import { idempotencyMiddleware } from "./middleware/idempotency";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { traceContextMiddleware } from "./middleware/traceContext";
import type { Env, Variables } from "./types/env";

/**
 * T023: Hono App Initialization
 * Sets up middleware pipeline and route structure
 */

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Core middleware pipeline
app.use("*", cors());
app.use("*", traceContextMiddleware());
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
import specsRouter from "./routes/specs";
import chatRouter from "./routes/chat";
import { jwksRoute } from "./routes/auth/jwks";

// Mount routes
app.route("/api/projects", projectsRouter);
app.route("/api/specs", specsRouter);
app.route("/api/chat", chatRouter);
app.get('/api/auth/jwks', jwksRoute);
// app.route("/api/environments", environmentsRouter);
// app.route("/api/specs", specsRouter);
// app.route("/api/chat", chatRouter);

// Global error handler (must be last)
app.onError(errorHandler);

export default app;
