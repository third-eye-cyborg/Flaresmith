import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { EnvironmentService } from "../../services/environmentService";
import { getDb } from "../../../db/connection";
import { getEnv } from "@cloudmake/utils";

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
    const db = getDb(getEnv("DATABASE_URL"));
    const environmentService = new EnvironmentService(db);

    try {
      const environments = await environmentService.getEnvironmentsWithStatus(projectId);

      return c.json({
        environments,
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
