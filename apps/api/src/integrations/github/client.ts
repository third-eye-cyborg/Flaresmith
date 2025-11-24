import { Octokit } from "@octokit/rest";

/**
 * T008: GitHub client wrapper with Octokit initialization and authentication
 * Provides centralized GitHub API client with authentication and rate limit handling
 */

export interface GitHubClientConfig {
  token: string;
  baseUrl?: string;
  userAgent?: string;
}

export class GitHubClient {
  private octokit: Octokit;
  
  constructor(config: GitHubClientConfig) {
    this.octokit = new Octokit({
      auth: config.token,
      baseUrl: config.baseUrl || "https://api.github.com",
      userAgent: config.userAgent || "Flaresmith/1.0",
    });
  }

  getOctokit(): Octokit {
    return this.octokit;
  }

  /**
   * Get authenticated user info
   */
  async getAuthenticatedUser() {
    const { data } = await this.octokit.users.getAuthenticated();
    return data;
  }

  /**
   * Check rate limit status
   */
  async getRateLimit() {
    const { data } = await this.octokit.rateLimit.get();
    return data;
  }
}

/**
 * Factory function to create GitHub client from environment
 */
export function createGitHubClient(token: string): GitHubClient {
  return new GitHubClient({ token });
}
