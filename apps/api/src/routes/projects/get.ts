import { Hono } from "hono";
import { z } from "zod";
import { GetProjectRequestSchema } from "@cloudmake/types";
import { ProjectService } from "../../services/projectService";

/**
 * T050: Implement GET /projects/:id endpoint
 * Retrieves project details by ID
 */

const app = new Hono();

app.get("/:id", async (c) => {
  try {
    const projectId = c.req.param("id");

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return c.json(
        {
          error: {
            code: "INVALID_PROJECT_ID",
            message: "Invalid project ID format",
            requestId: c.get("requestId"),
            timestamp: new Date().toISOString(),
          },
        },
        400
      );
    }

    // DI: instantiate ProjectService with direct Worker bindings (no global shim)
    const projectService = new ProjectService({
      githubToken: c.env.GITHUB_TOKEN,
      neonApiKey: c.env.NEON_API_KEY,
      cloudflareToken: c.env.CLOUDFLARE_API_TOKEN,
      postmanApiKey: c.env.POSTMAN_API_KEY,
      bindings: c.env,
    });

    const project = await projectService.getProject(projectId);

    return c.json(project, 200);
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return c.json(
        {
          error: {
            code: "PROJECT_NOT_FOUND",
            message: "Project not found",
            requestId: c.get("requestId"),
            timestamp: new Date().toISOString(),
          },
        },
        404
      );
    }

    console.error({
      timestamp: new Date().toISOString(),
      level: "error",
      requestId: c.get("requestId"),
      userId: c.get("userId"),
      actionType: "project.get",
      outcome: "error",
      code: "PROJECT_FETCH_FAILED",
      message: error.message,
    });

    return c.json(
      {
        error: {
          code: "PROJECT_FETCH_FAILED",
          message: error.message || "Failed to fetch project",
          requestId: c.get("requestId"),
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

export default app;
