import { type DbConnection } from "../../db/connection";
import { deployments, type Deployment } from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * T069: Deployment History Tracking Service
 * 
 * Manages deployment records and history for environments
 */

export class DeploymentService {
  constructor(private db: DbConnection) {}

  async createDeployment(data: {
    projectId: string;
    environmentId: string;
    sourceCommitSha: string;
    status?: "queued" | "running" | "succeeded" | "failed" | "rolledback";
    preview?: boolean;
    providerIds?: {
      cloudflareDeploymentId?: string;
      githubRunId?: string;
    };
  }): Promise<Deployment> {
    const [deployment] = await this.db
      .insert(deployments)
      .values({
        projectId: data.projectId,
        environmentId: data.environmentId,
        sourceCommitSha: data.sourceCommitSha,
        status: data.status || "queued",
        preview: data.preview ? "true" : "false",
        providerIds: data.providerIds || {},
      })
      .returning();

    if (!deployment) {
      throw new Error("Failed to create deployment");
    }

    return deployment;
  }

  async updateDeploymentStatus(
    deploymentId: string,
    status: "queued" | "running" | "succeeded" | "failed" | "rolledback"
  ): Promise<Deployment> {
    const [deployment] = await this.db
      .update(deployments)
      .set({ 
        status,
        updatedAt: new Date(),
      })
      .where(eq(deployments.id, deploymentId))
      .returning();

    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    return deployment;
  }

  async getDeploymentHistory(
    projectId: string,
    environmentId: string,
    limit = 10
  ): Promise<Deployment[]> {
    return await this.db
      .select()
      .from(deployments)
      .where(
        and(
          eq(deployments.projectId, projectId),
          eq(deployments.environmentId, environmentId)
        )
      )
      .orderBy(desc(deployments.createdAt))
      .limit(limit);
  }

  async getLatestDeployment(
    projectId: string,
    environmentId: string
  ): Promise<Deployment | null> {
    const [deployment] = await this.db
      .select()
      .from(deployments)
      .where(
        and(
          eq(deployments.projectId, projectId),
          eq(deployments.environmentId, environmentId)
        )
      )
      .orderBy(desc(deployments.createdAt))
      .limit(1);

    return deployment || null;
  }

  async getDeploymentById(deploymentId: string): Promise<Deployment | null> {
    const [deployment] = await this.db
      .select()
      .from(deployments)
      .where(eq(deployments.id, deploymentId))
      .limit(1);

    return deployment || null;
  }
}
