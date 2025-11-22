import { CloudMakeClient } from "../client";
import {
  GetEnvironmentsResponseSchema,
  type GetEnvironmentsResponse,
} from "@cloudmake/types";
import { z } from "zod";

/**
 * T076: Extended Environments Resource
 * Added promotion functionality
 */

const PromoteRequestSchema = z.object({
  sourceEnvironment: z.enum(["dev", "staging"]),
  targetEnvironment: z.enum(["staging", "prod"]),
});

const PromoteResponseSchema = z.object({
  success: z.boolean(),
  targetEnvironment: z.string(),
  deploymentId: z.string().optional(),
});

export class EnvironmentsResource {
  constructor(private client: CloudMakeClient) {}

  async list(projectId: string): Promise<GetEnvironmentsResponse> {
    return this.client.get(`/projects/${projectId}/environments`, GetEnvironmentsResponseSchema);
  }

  /**
   * Promote environment (dev→staging or staging→prod)
   */
  async promote(
    projectId: string,
    sourceEnvironment: "dev" | "staging",
    targetEnvironment: "staging" | "prod"
  ) {
    const body = PromoteRequestSchema.parse({ sourceEnvironment, targetEnvironment });
    return this.client.post(
      `/projects/${projectId}/promote`,
      PromoteResponseSchema,
      body
    );
  }

  /**
   * Check if promotion is possible
   */
  async canPromote(projectId: string, sourceEnv: "dev" | "staging") {
    const { environments } = await this.list(projectId);
    const sourceEnvironment = environments.find((e) => e.name === sourceEnv);

    if (!sourceEnvironment) {
      return { canPromote: false, reason: "Source environment not found" };
    }

    if (sourceEnvironment.lastDeployment?.status !== "succeeded") {
      return {
        canPromote: false,
        reason: "No successful deployment in source environment",
      };
    }

    return { canPromote: true };
  }
}
