import { Octokit } from "@octokit/rest";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import { githubApiQuotas, type GitHubApiQuota } from "../../db/schema/secretSync";

/**
 * T012: GitHub API quota service with methods: checkQuota(), updateQuota(), blockIfInsufficient()
 * Source: specs/002-github-secrets-sync/research.md (D-010)
 */

export type QuotaType = "core" | "secrets" | "graphql";

export interface QuotaStatus {
  quotaType: QuotaType;
  remaining: number;
  limit: number;
  resetAt: Date;
  percentageRemaining: number;
}

export class GitHubApiQuotaService {
  private octokit: Octokit;
  private db: ReturnType<typeof drizzle>;
  private readonly MINIMUM_QUOTA_THRESHOLD = 100; // Reserve 100 requests for critical operations

  constructor(octokit: Octokit, dbConnectionString: string) {
    this.octokit = octokit;
    this.db = drizzle(dbConnectionString);
  }

  /**
   * Check quota status from GitHub API and update database
   * Returns current quota information
   */
  async checkQuota(projectId: string, quotaType: QuotaType = "core"): Promise<QuotaStatus> {
    // Fetch fresh quota from GitHub API
    const { data } = await this.octokit.rateLimit.get();

    const quota = quotaType === "graphql" ? data.resources.graphql : data.resources.core;

    // Update database with fresh quota info
    await this.updateQuota(projectId, quotaType, {
      remaining: quota.remaining,
      limit: quota.limit,
      resetAt: new Date(quota.reset * 1000), // Convert Unix timestamp to Date
    });

    return {
      quotaType,
      remaining: quota.remaining,
      limit: quota.limit,
      resetAt: new Date(quota.reset * 1000),
      percentageRemaining: (quota.remaining / quota.limit) * 100,
    };
  }

  /**
   * Update quota information in database
   */
  async updateQuota(
    projectId: string,
    quotaType: QuotaType,
    quota: {
      remaining: number;
      limit: number;
      resetAt: Date;
    }
  ): Promise<void> {
    const now = new Date();

    // Upsert quota record
    await this.db
      .insert(githubApiQuotas)
      .values({
        projectId,
        quotaType,
        remaining: quota.remaining,
        limitValue: quota.limit,
        resetAt: quota.resetAt,
        lastCheckedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [githubApiQuotas.projectId, githubApiQuotas.quotaType],
        set: {
          remaining: quota.remaining,
          limitValue: quota.limit,
          resetAt: quota.resetAt,
          lastCheckedAt: now,
          updatedAt: now,
        },
      });
  }

  /**
   * Block operation if insufficient quota remaining
   * Throws error if quota below threshold
   */
  async blockIfInsufficient(
    projectId: string,
    quotaType: QuotaType = "core",
    requiredQuota: number = 1
  ): Promise<void> {
    // Check current quota
    const status = await this.checkQuota(projectId, quotaType);

    // Check if we have enough quota
    if (status.remaining < this.MINIMUM_QUOTA_THRESHOLD + requiredQuota) {
      const resetInMinutes = Math.ceil(
        (status.resetAt.getTime() - Date.now()) / 1000 / 60
      );

      throw new Error(
        `GITHUB_SECRETS_RATE_LIMIT_EXHAUSTED: GitHub ${quotaType} API quota exhausted. ` +
          `Remaining: ${status.remaining}/${status.limit}. ` +
          `Resets in ${resetInMinutes} minutes at ${status.resetAt.toISOString()}.`
      );
    }
  }

  /**
   * Get cached quota from database (without API call)
   * Useful for quick checks without hitting GitHub API
   */
  async getCachedQuota(
    projectId: string,
    quotaType: QuotaType = "core"
  ): Promise<GitHubApiQuota | null> {
    const [quota] = await this.db
      .select()
      .from(githubApiQuotas)
      .where(
        and(
          eq(githubApiQuotas.projectId, projectId),
          eq(githubApiQuotas.quotaType, quotaType)
        )
      )
      .limit(1);

    return quota || null;
  }

  /**
   * Parse quota from GitHub API response headers
   * Useful for updating quota after each API call
   */
  parseQuotaFromHeaders(
    headers: Record<string, string>
  ): {
    remaining: number;
    limit: number;
    resetAt: Date;
  } | null {
    const remaining = headers["x-ratelimit-remaining"];
    const limit = headers["x-ratelimit-limit"];
    const reset = headers["x-ratelimit-reset"];

    if (!remaining || !limit || !reset) {
      return null;
    }

    return {
      remaining: parseInt(remaining, 10),
      limit: parseInt(limit, 10),
      resetAt: new Date(parseInt(reset, 10) * 1000),
    };
  }
}
