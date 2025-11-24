import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  CreateEnvironmentsRequestSchema,
  CreateEnvironmentsResponseSchema,
  type CreateEnvironmentsRequest,
  type CreateEnvironmentsResponse,
} from "@flaresmith/types";
import { EnvironmentService } from "../../services/github/environmentService";
import { createGitHubClient } from "../../integrations/github/client";
import { GitHubAuditService } from "../../services/github/auditService";
import { SecretEncryptionService } from "../../integrations/github/encryption";
import { v4 as uuidv4 } from "uuid";

/**
 * T038-T041: POST /github/environments
 * Create GitHub environments with protection rules and secrets
 * Includes idempotency handling and comprehensive error handling
 */

const app = new Hono();

app.post(
  "/",
  zValidator("json", CreateEnvironmentsRequestSchema),
  async (c: any) => {
    const startTime = Date.now();
    const correlationId = uuidv4();

    try {
      const user = c.get("user");
      if (!user) {
        return c.json(
          {
            error: {
              code: "AUTH_REQUIRED",
              message: "Authentication required",
              severity: "error",
              retryPolicy: "none",
              requestId: correlationId,
              timestamp: new Date().toISOString(),
            },
          },
          401
        );
      }

      const request = c.req.valid("json") as CreateEnvironmentsRequest;
      const { projectId, environments: envConfigs } = request;

      // Get GitHub token from environment
      const githubToken = (c.env as any).GITHUB_TOKEN || process.env.GITHUB_TOKEN;
      if (!githubToken) {
        return c.json(
          {
            error: {
              code: "GITHUB_TOKEN_MISSING",
              message: "GitHub authentication token not configured",
              severity: "error",
              retryPolicy: "none",
              requestId: correlationId,
              timestamp: new Date().toISOString(),
            },
          },
          500
        );
      }

      // Initialize services
            const neonConnectionString =
              (c.env as any).DATABASE_URL || process.env.DATABASE_URL || "";

      const githubClient = createGitHubClient(githubToken);
      const octokit = githubClient.getOctokit();
      const auditService = new GitHubAuditService(neonConnectionString);
      const encryptionService = new SecretEncryptionService(octokit);
      const environmentService = new EnvironmentService(octokit, auditService, encryptionService);

      // Get repository info from project
      // TODO: Fetch from project integrations table
      const owner = (c.env as any).GITHUB_OWNER || process.env.GITHUB_OWNER || "flaresmith";
      const repo = (c.env as any).GITHUB_REPO || process.env.GITHUB_REPO || "cloudmake";

      const created: string[] = [];
      const updated: string[] = [];
      const errors: Array<{ environment: string; error: string; code: string }> = [];

      // T039: Iterate over environments and create each
      for (const envConfig of envConfigs) {
        try {
          // T040: Idempotency handled within environmentService.createEnvironment()
          const result = await environmentService.createEnvironment(
            {
              projectId,
              environmentName: envConfig.name,
              owner,
              repo,
              protectionRules: envConfig.protectionRules as any,
              secrets: envConfig.secrets,
              linkedResources: envConfig.linkedResources as any,
            },
            user.id
          );

          if (result.status === "created") {
            created.push(envConfig.name);
          } else {
            updated.push(envConfig.name);
          }
        } catch (error: any) {
          // T041: Error handling for specific failure cases
          let errorCode = "GITHUB_ENV_CREATION_FAILED";
          let errorMessage = error.message;

          // Check for specific GitHub API errors
          if (error.status === 404 && error.message?.includes("reviewer")) {
            errorCode = "GITHUB_ENV_REVIEWER_NOT_FOUND";
            errorMessage = `Reviewer user ID not found in repository. ${error.message}`;
          } else if (error.status === 422 && error.message?.includes("protection")) {
            errorCode = "GITHUB_ENV_PROTECTION_RULE_CONFLICT";
            errorMessage = `Protection rule conflict: ${error.message}`;
          } else if (error.status === 403) {
            errorCode = "GITHUB_ENV_PERMISSION_DENIED";
            errorMessage = `Insufficient permissions to create environment. ${error.message}`;
          } else if (error.status === 429) {
            errorCode = "GITHUB_ENV_RATE_LIMIT_EXHAUSTED";
            errorMessage = "GitHub API rate limit exhausted. Please try again later.";
          }

          errors.push({
            environment: envConfig.name,
            error: errorMessage,
            code: errorCode,
          });
        }
      }

      // Build response
      const response: CreateEnvironmentsResponse = {
        created,
        updated,
        errors,
        correlationId,
      };

      // Validate response against schema
      const validatedResponse = CreateEnvironmentsResponseSchema.parse(response);

      return c.json(validatedResponse, errors.length > 0 ? 207 : 200);
    } catch (error: any) {
      // Unexpected error
      return c.json(
        {
          error: {
            code: "GITHUB_ENV_UNEXPECTED_ERROR",
            message: error.message || "Unexpected error creating environments",
            severity: "error",
            retryPolicy: "safe",
            requestId: correlationId,
            timestamp: new Date().toISOString(),
            context: {
              durationMs: Date.now() - startTime,
            },
          },
        },
        500
      );
    }
  }
);

export default app;
