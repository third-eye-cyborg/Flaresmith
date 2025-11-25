/**
 * Stub GitHubEnvironmentService
 * Returns basic branch status metadata.
 */
export class GitHubEnvironmentService {
  constructor(private token: string, private owner: string, private repo: string) {}

  async getBranchStatus(branch: string): Promise<{ branch: string; aheadBy?: number; behindBy?: number; lastCommitSha?: string }> {
    // TODO: Use GitHub API /repos/{owner}/{repo}/branches/{branch}
    return { branch, aheadBy: 0, behindBy: 0, lastCommitSha: `stub-${branch}` };
  }
}
