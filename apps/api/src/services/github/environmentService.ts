import { Octokit } from "@octokit/rest";
import { BaseGitHubService } from "./baseGitHubService";
import { GitHubAuditService } from "./auditService";
import { SecretEncryptionService } from "../../integrations/github/encryption";
import { db } from "../../../db/connection";
import { githubEnvironmentConfigs, environments } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * T033-T037: Environment Service for GitHub Environments
 * Handles creation, configuration, and management of GitHub environments
 * with protection rules and environment-specific secrets
 */

export interface ProtectionRules {
  requiredReviewers?: number;
  reviewerIds?: number[];
  restrictToMainBranch?: boolean;
  waitTimer?: number; // minutes
}

export interface EnvironmentSecret {
  name: string;
  value: string;
}

export interface LinkedResources {
  neonBranchId?: string;
  cloudflareWorkerName?: string;
  cloudflarePagesProject?: string;
}

export interface CreateEnvironmentInput {
  projectId: string;
  environmentName: "dev" | "staging" | "production";
  owner: string;
  repo: string;
  protectionRules: ProtectionRules;
  secrets: EnvironmentSecret[];
  linkedResources: LinkedResources;
}

export interface CreateEnvironmentResult {
  githubEnvironmentId: number;
  configId: string;
  environmentName: string;
  status: "created" | "updated";
}

export class EnvironmentService extends BaseGitHubService {
  private auditService: GitHubAuditService;
  private encryptionService: SecretEncryptionService;

  constructor(
    octokit: Octokit,
    auditService: GitHubAuditService,
    encryptionService: SecretEncryptionService
  ) {
    super(octokit);
    this.auditService = auditService;
    this.encryptionService = encryptionService;
  }

  /**
   * T033: Create or update GitHub environment with protection rules and secrets
   * Returns created/updated status for idempotency
   */
  async createEnvironment(
    input: CreateEnvironmentInput,
    actorId: string
  ): Promise<CreateEnvironmentResult> {
    const correlationId = uuidv4();
    const startTime = Date.now();

    try {
      // T034: Create GitHub Environment via API
      const githubEnv = await this.createGitHubEnvironment(
        input.owner,
        input.repo,
        input.environmentName
      );

      // T035: Apply protection rules
      await this.applyProtectionRules(
        input.owner,
        input.repo,
        input.environmentName,
        input.protectionRules
      );

      // T036: Set environment secrets
      for (const secret of input.secrets) {
        await this.setEnvironmentSecret(
          input.owner,
          input.repo,
          input.environmentName,
          secret.name,
          secret.value
        );
      }

      // T037: Validate linked resources
      await this.validateLinkedResources(input.linkedResources);

      // Check if config already exists (idempotency)
      const [existing] = await db
        .select()
        .from(githubEnvironmentConfigs)
        .where(
          and(
            eq(githubEnvironmentConfigs.projectId, input.projectId),
            eq(githubEnvironmentConfigs.environmentName, input.environmentName)
          )
        )
        .limit(1);

      let configId: string;
      let status: "created" | "updated";

      if (existing) {
        // Update existing configuration
        await db
          .update(githubEnvironmentConfigs)
          .set({
            githubEnvironmentId: githubEnv.id,
            protectionRules: input.protectionRules,
            secrets: input.secrets.map((s) => ({
              name: s.name,
              lastUpdatedAt: new Date().toISOString(),
            })),
            linkedResources: input.linkedResources,
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(githubEnvironmentConfigs.id, existing.id));

        configId = existing.id;
        status = "updated";
      } else {
        // Create new configuration
        const [newConfig] = await db
          .insert(githubEnvironmentConfigs)
          .values({
            projectId: input.projectId,
            environmentName: input.environmentName,
            githubEnvironmentId: githubEnv.id,
            protectionRules: input.protectionRules,
            secrets: input.secrets.map((s) => ({
              name: s.name,
              lastUpdatedAt: new Date().toISOString(),
            })),
            linkedResources: input.linkedResources,
            status: "active",
          })
          .returning();

        configId = newConfig.id;
        status = "created";
      }

      // Update environments table with GitHub environment ID
      await this.updateEnvironmentRecord(
        input.projectId,
        input.environmentName,
        githubEnv.id
      );

      // T044: Audit logging
      await this.auditService.logSecretSyncEvent({
        projectId: input.projectId,
        actorId,
        operation: status === "created" ? "create" : "update",
        secretName: null,
        affectedScopes: [`github_env:${input.environmentName}`],
        status: "success",
        successCount: 1,
        failureCount: 0,
        correlationId,
        durationMs: Date.now() - startTime,
        metadata: {
          environmentName: input.environmentName,
          githubEnvironmentId: githubEnv.id,
          reviewerIds: input.protectionRules.reviewerIds || [],
          secretCount: input.secrets.length,
        },
      });

      return {
        githubEnvironmentId: githubEnv.id,
        configId,
        environmentName: input.environmentName,
        status,
      };
    } catch (error: any) {
      // T044: Audit failure
      await this.auditService.logSecretSyncEvent({
        projectId: input.projectId,
        actorId,
        operation: "create",
        secretName: null,
        affectedScopes: [`github_env:${input.environmentName}`],
        status: "failure",
        successCount: 0,
        failureCount: 1,
        errorMessage: error.message,
        correlationId,
        durationMs: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * T034: Create GitHub Environment using GitHub API
   * PUT /repos/{owner}/{repo}/environments/{environment_name}
   */
  private async createGitHubEnvironment(
    owner: string,
    repo: string,
    environmentName: string
  ): Promise<{ id: number; name: string }> {
    return this.withRetry(async () => {
      const { data } = await this.octokit.repos.createOrUpdateEnvironment({
        owner,
        repo,
        environment_name: environmentName,
      });

      return {
        id: data.id!,
        name: data.name!,
      };
    }, `createGitHubEnvironment:${environmentName}`);
  }

  /**
   * T035: Apply protection rules to GitHub Environment
   * Tiered structure: dev (none), staging (1 reviewer), production (1 reviewer + branch restriction)
   */
  private async applyProtectionRules(
    owner: string,
    repo: string,
    environmentName: string,
    rules: ProtectionRules
  ): Promise<void> {
    const reviewers = rules.reviewerIds
      ? rules.reviewerIds.map((id) => ({ type: "User" as const, id }))
      : [];

    const deploymentBranchPolicy = rules.restrictToMainBranch
      ? { protected_branches: true, custom_branch_policies: false }
      : null;

    return this.withRetry(async () => {
      await this.octokit.repos.createOrUpdateEnvironment({
        owner,
        repo,
        environment_name: environmentName,
        reviewers: reviewers.length > 0 ? reviewers : undefined,
        wait_timer: rules.waitTimer || 0,
        deployment_branch_policy: deploymentBranchPolicy || undefined,
      });
    }, `applyProtectionRules:${environmentName}`);
  }

  /**
   * T036: Set environment-specific secret
   * PUT /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}
   */
  private async setEnvironmentSecret(
    owner: string,
    repo: string,
    environmentName: string,
    secretName: string,
    secretValue: string
  ): Promise<void> {
    // Get repository public key for encryption
    const publicKey = await this.encryptionService.getRepositoryPublicKey(owner, repo);

    // Encrypt secret value
    const encryptedValue = await this.encryptionService.encryptSecret(secretValue, publicKey.key);

    return this.withRetry(async () => {
      await this.octokit.actions.createOrUpdateEnvironmentSecret({
        repository_id: await this.getRepositoryId(owner, repo),
        environment_name: environmentName,
        secret_name: secretName,
        encrypted_value: encryptedValue,
        key_id: publicKey.key_id,
      });
    }, `setEnvironmentSecret:${environmentName}:${secretName}`);
  }

  /**
   * T037: Validate linked resources exist before associating with environment
   * Throws error if resources don't exist
   */
  private async validateLinkedResources(resources: LinkedResources): Promise<void> {
    const errors: string[] = [];

    // Validate Neon branch ID
    if (resources.neonBranchId) {
      const isValid = await this.validateNeonBranchId(resources.neonBranchId);
      if (!isValid) {
        errors.push(`Neon branch ID ${resources.neonBranchId} not found`);
      }
    }

    // Validate Cloudflare Worker name
    if (resources.cloudflareWorkerName) {
      const isValid = await this.validateCloudflareWorkerName(resources.cloudflareWorkerName);
      if (!isValid) {
        errors.push(`Cloudflare Worker ${resources.cloudflareWorkerName} not found`);
      }
    }

    // Validate Cloudflare Pages project
    if (resources.cloudflarePagesProject) {
      const isValid = await this.validateCloudflarePagesProject(resources.cloudflarePagesProject);
      if (!isValid) {
        errors.push(`Cloudflare Pages project ${resources.cloudflarePagesProject} not found`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Linked resource validation failed: ${errors.join(", ")}`);
    }
  }

  /**
   * Validate Neon branch exists
   * TODO: Implement actual Neon API check when Neon integration service is available
   */
  private async validateNeonBranchId(branchId: string): Promise<boolean> {
    // Placeholder: Always return true for now
    // In production, this should call Neon API to verify branch exists
    return true;
  }

  /**
   * Validate Cloudflare Worker exists
   * TODO: Implement actual Cloudflare API check when Cloudflare integration service is available
   */
  private async validateCloudflareWorkerName(workerName: string): Promise<boolean> {
    // Placeholder: Always return true for now
    // In production, this should call Cloudflare API to verify worker exists
    return true;
  }

  /**
   * Validate Cloudflare Pages project exists
   * TODO: Implement actual Cloudflare API check when Cloudflare integration service is available
   */
  private async validateCloudflarePagesProject(projectName: string): Promise<boolean> {
    // Placeholder: Always return true for now
    // In production, this should call Cloudflare API to verify pages project exists
    return true;
  }

  /**
   * Update environments table with GitHub environment ID
   */
  private async updateEnvironmentRecord(
    projectId: string,
    environmentName: string,
    githubEnvironmentId: number
  ): Promise<void> {
    await db
      .update(environments)
      .set({
        githubEnvironmentId,
        secretsLastSyncedAt: new Date(),
        syncStatus: "synced",
        updatedAt: new Date(),
      })
      .where(
        and(eq(environments.projectId, projectId), eq(environments.name, environmentName))
      );
  }

  /**
   * Get repository ID from owner and repo name
   */
  private async getRepositoryId(owner: string, repo: string): Promise<number> {
    return this.withRetry(async () => {
      const { data } = await this.octokit.repos.get({ owner, repo });
      return data.id;
    }, `getRepositoryId:${owner}/${repo}`);
  }
}
