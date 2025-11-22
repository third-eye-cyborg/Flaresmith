import { type DbConnection } from "../../db/connection";
import { environments, deployments, builds, integrationConfigs, type IntegrationConfig } from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { GitHubEnvironmentService } from "../integrations/github/environmentService";
import { CloudflareStatusService } from "../integrations/cloudflare/statusService";
import { NeonStatusService } from "../integrations/neon/statusService";
import { PostmanEnvironmentService } from "../integrations/postman/environmentService";
import type { EnvironmentStatus } from "../../../../packages/types/src/api/environments";

/**
 * Environment Service
 * 
 * Aggregates environment status across all integrations (GitHub, Cloudflare, Neon, Postman)
 * for the environment dashboard
 */

export class EnvironmentService {
  constructor(private db: DbConnection) {}

  async getEnvironmentsWithStatus(projectId: string): Promise<EnvironmentStatus[]> {
    // Fetch all environments for the project
    const envRecords = await this.db
      .select()
      .from(environments)
      .where(eq(environments.projectId, projectId));

    // Fetch integration configs
    const configs = await this.db
      .select()
      .from(integrationConfigs)
      .where(eq(integrationConfigs.projectId, projectId));

    // Create integration service instances
    const githubConfig = configs.find((c: IntegrationConfig) => c.provider === "github");
    const cloudflareConfig = configs.find((c: IntegrationConfig) => c.provider === "cloudflare");
    const neonConfig = configs.find((c: IntegrationConfig) => c.provider === "neon");
    const postmanConfig = configs.find((c: IntegrationConfig) => c.provider === "postman");

    // Initialize services if configs exist
    const githubService = githubConfig 
      ? new GitHubEnvironmentService(
          (githubConfig.config as any).token,
          (githubConfig.config as any).owner,
          (githubConfig.config as any).repo
        )
      : null;

    const cloudflareService = cloudflareConfig
      ? new CloudflareStatusService(
          (cloudflareConfig.config as any).apiToken,
          (cloudflareConfig.config as any).accountId
        )
      : null;

    const neonService = neonConfig
      ? new NeonStatusService(
          (neonConfig.config as any).apiKey,
          (neonConfig.config as any).projectId
        )
      : null;

    const postmanService = postmanConfig
      ? new PostmanEnvironmentService(
          (postmanConfig.config as any).apiKey,
          (postmanConfig.config as any).workspaceId
        )
      : null;

    // Aggregate status for each environment
    const environmentStatuses = await Promise.all(
      envRecords.map(async (env) => {
        // Fetch last deployment
        const lastDeploymentRecord = await this.db
          .select()
          .from(deployments)
          .where(
            and(
              eq(deployments.projectId, projectId),
              eq(deployments.environmentId, env.id)
            )
          )
          .orderBy(desc(deployments.createdAt))
          .limit(1);

        // Fetch last build
        const lastBuildRecord = await this.db
          .select()
          .from(builds)
          .where(
            and(
              eq(builds.projectId, projectId),
              eq(builds.environmentId, env.id)
            )
          )
          .orderBy(desc(builds.createdAt))
          .limit(1);

        // Fetch integration statuses in parallel
        const [githubStatus, cloudflareStatus, neonStatus, postmanStatus] = await Promise.all([
          githubService?.getBranchStatus(env.githubBranch) || null,
          cloudflareService?.getPageDeploymentStatus(projectId, env.name) || null,
          neonService?.getBranchStatus(env.name) || null,
          postmanService?.getEnvironmentStatus(env.name) || null,
        ]);

        const status: EnvironmentStatus = {
          id: env.id,
          projectId: env.projectId,
          name: env.name,
          kind: env.kind as "core" | "preview",
          githubBranch: env.githubBranch,
          cloudflareUrl: env.cloudflareUrl || undefined,
          neonBranchId: env.neonBranchId || undefined,
          postmanEnvironmentId: env.postmanEnvironmentId || undefined,
          lastDeploymentId: env.lastDeploymentId || undefined,
          ttlExpiresAt: env.ttlExpiresAt?.toISOString(),
          createdAt: env.createdAt.toISOString(),
          updatedAt: env.updatedAt.toISOString(),
          
          github: githubStatus || undefined,
          cloudflare: cloudflareStatus || undefined,
          neon: neonStatus || undefined,
          postman: postmanStatus || undefined,

          lastDeployment: lastDeploymentRecord[0]
            ? {
                id: lastDeploymentRecord[0].id,
                status: lastDeploymentRecord[0].status as any,
                commitSha: lastDeploymentRecord[0].sourceCommitSha,
                createdAt: lastDeploymentRecord[0].createdAt.toISOString(),
              }
            : undefined,

          lastBuild: lastBuildRecord[0]
            ? {
                id: lastBuildRecord[0].id,
                status: lastBuildRecord[0].status as any,
                commitSha: lastBuildRecord[0].commitSha,
                createdAt: lastBuildRecord[0].createdAt.toISOString(),
              }
            : undefined,
        };

        return status;
      })
    );

    return environmentStatuses;
  }
}
