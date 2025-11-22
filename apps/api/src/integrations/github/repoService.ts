import { Octokit } from "@octokit/rest";

/**
 * T042: GitHub integration service for repo creation
 * Handles repository creation with idempotent behavior
 */

export interface CreateRepoInput {
  name: string;
  orgName: string;
  description?: string;
  isPrivate?: boolean;
  defaultBranch?: string;
}

export interface CreateRepoOutput {
  fullName: string;
  cloneUrl: string;
  defaultBranch: string;
  htmlUrl: string;
}

export class GitHubRepoService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async createRepo(input: CreateRepoInput): Promise<CreateRepoOutput> {
    const { name, orgName, description, isPrivate = true, defaultBranch = "main" } = input;

    try {
      // Check if repo already exists (idempotent)
      try {
        const existing = await this.octokit.repos.get({
          owner: orgName,
          repo: name,
        });

        return {
          fullName: existing.data.full_name,
          cloneUrl: existing.data.clone_url,
          defaultBranch: existing.data.default_branch,
          htmlUrl: existing.data.html_url,
        };
      } catch (error: any) {
        if (error.status !== 404) {
          throw error;
        }
        // Repo doesn't exist, proceed with creation
      }

      // Create new repository
      const repo = await this.octokit.repos.createInOrg({
        org: orgName,
        name,
        description,
        private: isPrivate,
        auto_init: true,
        default_branch: defaultBranch,
      });

      return {
        fullName: repo.data.full_name,
        cloneUrl: repo.data.clone_url,
        defaultBranch: repo.data.default_branch,
        htmlUrl: repo.data.html_url,
      };
    } catch (error: any) {
      throw new Error(`GitHub repo creation failed: ${error.message}`);
    }
  }

  async deleteRepo(owner: string, repo: string): Promise<void> {
    try {
      await this.octokit.repos.delete({
        owner,
        repo,
      });
    } catch (error: any) {
      throw new Error(`GitHub repo deletion failed: ${error.message}`);
    }
  }

  async getRepo(owner: string, repo: string) {
    try {
      const response = await this.octokit.repos.get({
        owner,
        repo,
      });

      return {
        fullName: response.data.full_name,
        cloneUrl: response.data.clone_url,
        defaultBranch: response.data.default_branch,
        htmlUrl: response.data.html_url,
        isPrivate: response.data.private,
      };
    } catch (error: any) {
      throw new Error(`GitHub repo fetch failed: ${error.message}`);
    }
  }

  async createBranch(owner: string, repo: string, branchName: string, fromBranch: string) {
    try {
      // Get the SHA of the source branch
      const { data: ref } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${fromBranch}`,
      });

      // Create new branch
      await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha,
      });

      return {
        branchName,
        sha: ref.object.sha,
      };
    } catch (error: any) {
      if (error.status === 422 && error.message.includes("already exists")) {
        // Branch already exists, return existing
        const { data: ref } = await this.octokit.git.getRef({
          owner,
          repo,
          ref: `heads/${branchName}`,
        });

        return {
          branchName,
          sha: ref.object.sha,
        };
      }
      throw new Error(`GitHub branch creation failed: ${error.message}`);
    }
  }

  async createEnvironment(owner: string, repo: string, environmentName: string) {
    try {
      // Create or update environment
      await this.octokit.repos.createOrUpdateEnvironment({
        owner,
        repo,
        environment_name: environmentName,
      });

      return { environmentName };
    } catch (error: any) {
      throw new Error(`GitHub environment creation failed: ${error.message}`);
    }
  }
}
