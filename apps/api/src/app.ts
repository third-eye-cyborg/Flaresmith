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
import { analyticsMiddleware } from "./middleware/analytics";
import { secretRedactionMiddleware } from "./middleware/secretRedaction";
import type { Env, Variables } from "./types/env";

/**
 * T023: Hono App Initialization
 * Sets up middleware pipeline and route structure
 */

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Core middleware pipeline
app.use("*", cors());
app.use("*", secretRedactionMiddleware); // T014: Secret redaction before all logging
app.use("*", traceContextMiddleware());
app.use("*", analyticsMiddleware);
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

// Public auth routes (no auth middleware required)
import registerRoute from "./routes/auth/register";
import loginRoute from "./routes/auth/login";
import refreshRoute from "./routes/auth/refresh";
import oauthCallbackRoute from "./routes/auth/oauthCallback";
import signoutRoute from "./routes/auth/signout";
import signoutAllRoute from "./routes/auth/signoutAll";
import { jwksRoute } from "./routes/auth/jwks";

app.route("/api/auth/register", registerRoute);
app.route("/api/auth/login", loginRoute);
app.route("/api/auth/refresh", refreshRoute);
app.route("/api/auth/oauth/callback", oauthCallbackRoute);
app.route("/api/auth/signout", signoutRoute);
app.route("/api/auth/signoutAll", signoutAllRoute);
app.get('/api/auth/jwks', jwksRoute);

// Protected routes with auth + idempotency + rate limiting
app.use("/api/*", authMiddleware());
app.use("/api/*", rateLimitMiddleware());
app.use("/api/projects/*", idempotencyMiddleware(["POST", "PUT", "DELETE"]));
app.use("/api/environments/*", idempotencyMiddleware(["POST", "PUT", "DELETE"]));

// Route imports
import projectsRouter from "./routes/projects";
import specsRouter from "./routes/specs";
import chatRouter from "./routes/chat";
import getTokensRoute from "./routes/designSystem/getTokens";
import billingWebCheckoutRoute from "./routes/billing/web/checkout";
import billingMobileReceiptRoute from "./routes/billing/mobile/receipt";
import polarWebhookRoute from "./routes/webhooks/polar";
import mcpMetricsRoute from "./routes/mcp/metrics";
import rateLimitStatusRoute from "./routes/rateLimit/status";
import mcpDegradationRoute from "./routes/mcp/degradation";

// Mount routes
app.route("/api/projects", projectsRouter);
app.route("/api/specs", specsRouter);
app.route("/api/chat", chatRouter);
app.route("/api/design/tokens", getTokensRoute);
app.route("/billing/web", billingWebCheckoutRoute);
app.route("/billing/mobile", billingMobileReceiptRoute);
app.route("/webhooks", polarWebhookRoute);
app.route("/api/mcp/metrics", mcpMetricsRoute);
app.route("/api/rate-limit/status", rateLimitStatusRoute);
app.route("/api/mcp/degradation", mcpDegradationRoute);
// app.route("/api/environments", environmentsRouter);
// app.route("/api/specs", specsRouter);
// app.route("/api/chat", chatRouter);
app.route("/api/design/tokens", getTokensRoute);

// Global error handler (must be last)
app.onError(errorHandler);

export default app;
