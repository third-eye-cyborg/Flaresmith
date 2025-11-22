import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { PromotionService } from "../../services/promotionService";
import { getDb } from "../../../db/connection";
import { getEnv } from "@cloudmake/utils";

/**
 * T070: POST /projects/:id/promote endpoint
 * 
 * Triggers environment promotion (dev→staging or staging→prod)
 */

const app = new Hono();

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const bodySchema = z.object({
  sourceEnvironment: z.enum(["dev", "staging"]),
  targetEnvironment: z.enum(["staging", "prod"]),
});

app.post(
  "/:id/promote",
  zValidator("param", paramsSchema),
  zValidator("json", bodySchema),
  async (c) => {
    const { id: projectId } = c.req.valid("param");
    const { sourceEnvironment, targetEnvironment } = c.req.valid("json");

    const db = getDb(getEnv("DATABASE_URL"));
    const promotionService = new PromotionService(db);

    try {
      const result = await promotionService.promoteEnvironment(
        projectId,
        sourceEnvironment,
        targetEnvironment
      );

      if (!result.success) {
        return c.json(
          {
            error: {
              code: "ENV_PROMOTION_FAILED",
              message: result.error || "Promotion failed",
              severity: "error",
              retryPolicy: "none",
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              context: { projectId, sourceEnvironment, targetEnvironment },
            },
          },
          400
        );
      }

      return c.json({
        success: true,
        targetEnvironment: result.targetEnvironment,
        deploymentId: result.deploymentId,
      });
    } catch (error) {
      console.error("Promotion error:", error);
      return c.json(
        {
          error: {
            code: "ENV_PROMOTION_ERROR",
            message: "Unexpected error during promotion",
            severity: "error",
            retryPolicy: "safe",
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            context: { projectId, sourceEnvironment, targetEnvironment },
          },
        },
        500
      );
    }
  }
);

export default app;
