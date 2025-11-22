import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { CreateProjectRequestSchema, CreateProjectResponseSchema } from "@cloudmake/types";
import { ProjectService } from "../../services/projectService";
import { checkIdempotency, recordIdempotency } from "../../services/idempotency";
import { getDb } from "../../../db/connection";
import { getEnv } from "@cloudmake/utils";

/**
 * T049: Implement POST /projects endpoint with validation and idempotency
 * Creates new project with all integrations
 */

const app = new Hono();

app.post("/", zValidator("json", CreateProjectRequestSchema), async (c) => {
  try {
    const body = c.req.valid("json");
    const userId = c.get("userId") as string;
    const requestId = c.get("requestId") as string;

    // Generate idempotency key
    const idempotencyKey =
      body.idempotencyKey || `${body.orgId}-githubRepo-${body.slug}`;

    // Check for existing operation
    const db = getDb(getEnv("DATABASE_URL"));
    const existing = await checkIdempotency(db, idempotencyKey);

    if (existing) {
      return c.json(existing.result, 200);
    }

    // Create project service
    const projectService = new ProjectService({
      githubToken: getEnv("GITHUB_TOKEN"),
      neonApiKey: getEnv("NEON_API_KEY"),
      cloudflareToken: getEnv("CLOUDFLARE_API_TOKEN"),
      postmanApiKey: getEnv("POSTMAN_API_KEY"),
    });

    // Create project
    const result = await projectService.createProject({
      name: body.name,
      slug: body.slug,
      orgId: body.orgId,
      integrations: body.integrations,
    });

    // Record idempotency
    await recordIdempotency(db, idempotencyKey, requestId, userId, result);

    // Log audit event
    console.log({
      timestamp: new Date().toISOString(),
      level: "info",
      requestId,
      userId,
      actionType: "project.create",
      resourceId: result.projectId,
      outcome: "success",
      code: "PROJECT_CREATED",
    });

    return c.json(result, 201);
  } catch (error: any) {
    console.error({
      timestamp: new Date().toISOString(),
      level: "error",
      requestId: c.get("requestId"),
      userId: c.get("userId"),
      actionType: "project.create",
      outcome: "error",
      code: "PROJECT_CREATE_FAILED",
      message: error.message,
    });

    return c.json(
      {
        error: {
          code: "PROJECT_CREATE_FAILED",
          message: error.message || "Failed to create project",
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

export default app;
