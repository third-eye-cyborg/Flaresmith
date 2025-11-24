import { type DbConnection } from "../../db/connection";
import { environments, deployments } from "../../db/schema";
import { eq, and } from "drizzle-orm";

/**
 * T071: Environment Promotion Service
 * 
 * Handles environment promotion logic (dev→staging, staging→prod)
 * Implements promotion validation and orchestration
 */

interface PromotionResult {
  success: boolean;
  targetEnvironment: string;
  deploymentId?: string;
  error?: string;
}

export class PromotionService {
  constructor(private db: DbConnection) {}

  async promoteEnvironment(
    projectId: string,
    sourceEnv: "dev" | "staging",
    targetEnv: "staging" | "prod"
  ): Promise<PromotionResult> {
    // Validate promotion path
    if (sourceEnv === "dev" && targetEnv !== "staging") {
      return {
        success: false,
        targetEnvironment: targetEnv,
        error: "Invalid promotion path: dev can only promote to staging",
      };
    }

    if (sourceEnv === "staging" && targetEnv !== "prod") {
      return {
        success: false,
        targetEnvironment: targetEnv,
        error: "Invalid promotion path: staging can only promote to prod",
      };
    }

    try {
      // Fetch source environment
      const [sourceEnvironment] = await this.db
        .select()
        .from(environments)
        .where(
          and(
            eq(environments.projectId, projectId),
            eq(environments.name, sourceEnv)
          )
        )
        .limit(1);

      if (!sourceEnvironment) {
        return {
          success: false,
          targetEnvironment: targetEnv,
          error: `Source environment ${sourceEnv} not found`,
        };
      }

      // Fetch target environment
      const [targetEnvironment] = await this.db
        .select()
        .from(environments)
        .where(
          and(
            eq(environments.projectId, projectId),
            eq(environments.name, targetEnv)
          )
        )
        .limit(1);

      if (!targetEnvironment) {
        return {
          success: false,
          targetEnvironment: targetEnv,
          error: `Target environment ${targetEnv} not found`,
        };
      }

      // Get latest successful deployment from source
      const [sourceDeployment] = await this.db
        .select()
        .from(deployments)
        .where(
          and(
            eq(deployments.projectId, projectId),
            eq(deployments.environmentId, sourceEnvironment.id),
            eq(deployments.status, "succeeded")
          )
        )
        .orderBy(deployments.createdAt)
        .limit(1);

      if (!sourceDeployment) {
        return {
          success: false,
          targetEnvironment: targetEnv,
          error: `No successful deployment found in ${sourceEnv}`,
        };
      }

      // Create new deployment in target environment with same commit
      const [newDeployment] = await this.db
        .insert(deployments)
        .values({
          projectId,
          environmentId: targetEnvironment.id,
          sourceCommitSha: sourceDeployment.sourceCommitSha,
          status: "queued",
          preview: "false",
          providerIds: {},
        })
        .returning();

      if (!newDeployment) {
        return {
          success: false,
          targetEnvironment: targetEnv,
          error: "Failed to create deployment record",
        };
      }

      return {
        success: true,
        targetEnvironment: targetEnv,
        deploymentId: newDeployment.id,
      };
    } catch (error) {
      console.error("Promotion error:", error);
      return {
        success: false,
        targetEnvironment: targetEnv,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async canPromote(
    projectId: string,
    sourceEnv: "dev" | "staging"
  ): Promise<{ canPromote: boolean; reason?: string }> {
    // Check if there's a successful deployment in source
    const [sourceEnvironment] = await this.db
      .select()
      .from(environments)
      .where(
        and(
          eq(environments.projectId, projectId),
          eq(environments.name, sourceEnv)
        )
      )
      .limit(1);

    if (!sourceEnvironment) {
      return {
        canPromote: false,
        reason: `Source environment ${sourceEnv} not found`,
      };
    }

    const [deployment] = await this.db
      .select()
      .from(deployments)
      .where(
        and(
          eq(deployments.projectId, projectId),
          eq(deployments.environmentId, sourceEnvironment.id),
          eq(deployments.status, "succeeded")
        )
      )
      .limit(1);

    if (!deployment) {
      return {
        canPromote: false,
        reason: `No successful deployment found in ${sourceEnv}`,
      };
    }

    return { canPromote: true };
  }
}
