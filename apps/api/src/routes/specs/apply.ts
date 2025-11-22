import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ApplySpecRequestSchema } from "@cloudmake/types";
import { getDb } from "../../../db/connection";
import { getEnv } from "@cloudmake/utils";
import { SpecApplyService } from "../../services/specApplyService";

/**
 * T089: POST /specs/apply endpoint
 */
const app = new Hono();

app.post(
  "/apply",
  zValidator("json", ApplySpecRequestSchema),
  async (c) => {
    const { projectId } = c.req.valid("json");

    try {
      const db = getDb(getEnv("DATABASE_URL"));
      const service = new SpecApplyService(db);

      // NOTE: For now, use the active feature directory; future: accept in request
      const featureDir = "specs/001-platform-bootstrap";
      const report = await service.apply(projectId, featureDir);

      return c.json(report);
    } catch (error) {
      console.error("Error applying spec:", error);
      return c.json(
        {
          error: {
            code: "SPEC_APPLY_FAILED",
            message: "Failed to apply specification changes.",
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
