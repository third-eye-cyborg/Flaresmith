/**
 * Stub GitHubRepoService for repository/environment operations.
 */
export class GitHubRepoService {
  constructor(private token: string) {}

  async createEnvironment(owner: string, repo: string, name: string): Promise<{ name: string }> {
    // TODO: GitHub API call to create environment
    return { name };
  }

  async createBranch(owner: string, repo: string, branch: string, from: string): Promise<{ branch: string }> {
    // TODO: GitHub API call to create branch from base
    return { branch };
  }
}
