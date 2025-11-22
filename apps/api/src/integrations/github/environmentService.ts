/**
 * GitHub Environment Service
 * 
 * Fetches branch and environment status from GitHub API for environment dashboard
 */

interface GitHubBranchStatus {
  branch: string;
  lastCommitSha?: string;
  lastCommitMessage?: string;
  lastCommitAt?: string;
  status: "active" | "stale" | "error";
}

export class GitHubEnvironmentService {
  private githubToken: string;
  private owner: string;
  private repo: string;

  constructor(githubToken: string, owner: string, repo: string) {
    this.githubToken = githubToken;
    this.owner = owner;
    this.repo = repo;
  }

  async getBranchStatus(branchName: string): Promise<GitHubBranchStatus> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/branches/${branchName}`,
        {
          headers: {
            Authorization: `Bearer ${this.githubToken}`,
            Accept: "application/vnd.github+json",
          },
        }
      );

      if (!response.ok) {
        return {
          branch: branchName,
          status: "error",
        };
      }

      const data = await response.json() as any;
      const commit = data.commit;

      // Check if branch is stale (no commits in last 30 days)
      const commitDate = new Date(commit.commit.author.date);
      const daysSinceCommit = (Date.now() - commitDate.getTime()) / (1000 * 60 * 60 * 24);
      const isStale = daysSinceCommit > 30;

      return {
        branch: branchName,
        lastCommitSha: commit.sha,
        lastCommitMessage: commit.commit.message.split("\n")[0], // First line only
        lastCommitAt: commit.commit.author.date,
        status: isStale ? "stale" : "active",
      };
    } catch (error) {
      console.error(`Error fetching GitHub branch status for ${branchName}:`, error);
      return {
        branch: branchName,
        status: "error",
      };
    }
  }

  async listEnvironments(): Promise<string[]> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/environments`,
        {
          headers: {
            Authorization: `Bearer ${this.githubToken}`,
            Accept: "application/vnd.github+json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to list environments: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.environments?.map((env: any) => env.name) || [];
    } catch (error) {
      console.error("Error listing GitHub environments:", error);
      return [];
    }
  }
}
