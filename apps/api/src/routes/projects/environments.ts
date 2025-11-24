import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { EnvironmentService } from "../../services/environmentService";
import { circuitBreakerRegistry } from "@flaresmith/utils";
import { getDb } from "../../../db/connection";

/**
 * T068: GET /projects/:id/environments endpoint
 * 
 * Returns environment matrix with status from all integrations
 */

const app = new Hono();

const paramsSchema = z.object({
  id: z.string().uuid(),
});

app.get(
  "/:id/environments",
  zValidator("param", paramsSchema),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    
    // Get database connection
    const db = getDb(c.env.DATABASE_URL);
    const environmentService = new EnvironmentService(db);

    try {
      const environments = await environmentService.getEnvironmentsWithStatus(projectId);

      // Collect circuit breaker metrics
      const circuitBreakers = Array.from(circuitBreakerRegistry.getAll().entries()).map(([name, breaker]) => {
        const metrics = breaker.getMetrics();
        return {
          name,
            state: metrics.state,
            failures: metrics.failures,
            lastFailureTime: metrics.lastFailureTime || null,
            halfOpenAttempts: metrics.halfOpenAttempts,
            halfOpenSuccesses: metrics.halfOpenSuccesses,
        };
      });

      // Rate limit remaining tokens (set by rateLimitMiddleware)
      const userRemaining = (c as any).get("rateLimitUserRemaining") as number | undefined;
      const projectRemaining = (c as any).get("rateLimitProjectRemaining") as number | undefined;

      return c.json({
        environments,
        meta: {
          rateLimit: {
            userRemaining: typeof userRemaining === "number" ? userRemaining : null,
            projectRemaining: typeof projectRemaining === "number" ? projectRemaining : null,
          },
          circuitBreakers,
        },
      });
    } catch (error) {
      console.error("Error fetching environments:", error);
      return c.json(
        {
          error: {
            code: "ENV_FETCH_FAILED",
            message: "Failed to fetch environment status",
            severity: "error",
            retryPolicy: "safe",
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            context: { projectId },
          },
        },
        500
      );
    }
  }
);

export default app;
