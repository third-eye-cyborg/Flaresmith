import { Octokit } from '@octokit/rest';
import { EnvironmentService } from '../github/environmentService';
import { GitHubAuditService } from '../github/auditService';
import { SecretEncryptionService } from '../../integrations/github/encryption';
import { v4 as uuidv4 } from 'uuid';

/**
 * T042: ProjectProvisioningService
 * Integrates GitHub environment creation into project provisioning workflow.
 * After the GitHub repository is created, this service provisions the core environments
 * (dev, staging, production) with appropriate protection rules and seeds initial secrets.
 */
export interface ProvisionProjectInput {
  projectId: string;
  owner: string;
  repo: string;
  actorId: string; // user performing provisioning
  reviewerId?: number; // optional GitHub user ID for staging/prod approvals
  initialSecrets?: { name: string; dev: string; staging: string; production: string }[];
}

export interface ProvisionProjectResult {
  correlationId: string;
  environments: Array<{ name: string; status: 'created' | 'updated'; githubEnvironmentId: number }>;  
}

export class ProjectProvisioningService {
  private environmentService: EnvironmentService;

  constructor(
    octokit: Octokit,
    auditService: GitHubAuditService,
    encryptionService: SecretEncryptionService
  ) {
    this.environmentService = new EnvironmentService(octokit, auditService, encryptionService);
  }

  /**
   * Provision core GitHub environments for a project.
   * Idempotent: repeated calls update existing configs.
   */
  async provisionProject(input: ProvisionProjectInput): Promise<ProvisionProjectResult> {
    const correlationId = uuidv4();
    const envNames: Array<'dev' | 'staging' | 'production'> = ['dev', 'staging', 'production'];

    const results: ProvisionProjectResult['environments'] = [];

    for (const envName of envNames) {
      // Determine protection rules per environment (mirrors spec & research D-004)
      const protectionRules = this.getProtectionRules(envName, input.reviewerId);

      // Collect environment-specific secrets
      const envSecrets = (input.initialSecrets || []).map((s) => ({
        name: s.name,
        value: envName === 'dev' ? s.dev : envName === 'staging' ? s.staging : s.production,
      }));

      const result = await this.environmentService.createEnvironment(
        {
          projectId: input.projectId,
            owner: input.owner,
            repo: input.repo,
            environmentName: envName,
            protectionRules,
            secrets: envSecrets,
            linkedResources: {
              neonBranchId: this.deriveNeonBranchId(envName, input.projectId),
              cloudflareWorkerName: this.deriveWorkerName(envName, input.repo),
              cloudflarePagesProject: this.derivePagesProject(envName, input.repo),
            },
        },
        input.actorId
      );

      results.push({
        name: envName,
        status: result.status,
        githubEnvironmentId: result.githubEnvironmentId,
      });
    }

    return { correlationId, environments: results };
  }

  private getProtectionRules(env: 'dev' | 'staging' | 'production', reviewerId?: number) {
    if (env === 'dev') {
      return { requiredReviewers: 0, restrictToMainBranch: false, waitTimer: 0 };
    }
    if (env === 'staging') {
      const rules: any = {
        requiredReviewers: reviewerId ? 1 : 0,
        restrictToMainBranch: false,
        waitTimer: 0,
      };
      if (reviewerId) {
        rules.reviewerIds = [reviewerId];
      }
      return rules as any;
    }
    // production
    const prodRules: any = {
      requiredReviewers: reviewerId ? 1 : 0,
      restrictToMainBranch: true,
      waitTimer: 0,
    };
    if (reviewerId) {
      prodRules.reviewerIds = [reviewerId];
    }
    return prodRules as any;
  }

  /**
   * Placeholder resource derivation helpers (spec-driven naming convention)
   * These can be replaced with integration-specific services.
   */
  private deriveNeonBranchId(env: 'dev' | 'staging' | 'production', projectId: string) {
    // Example convention: neon branch IDs stored externally; placeholder synthetic ID
    return `${projectId}-${env}`;
  }
  private deriveWorkerName(env: 'dev' | 'staging' | 'production', repo: string) {
    return env === 'production' ? `${repo}-api` : `${repo}-api-${env}`;
  }
  private derivePagesProject(env: 'dev' | 'staging' | 'production', repo: string) {
    return env === 'production' ? `${repo}-web` : `${repo}-web-${env}`;
  }
}
