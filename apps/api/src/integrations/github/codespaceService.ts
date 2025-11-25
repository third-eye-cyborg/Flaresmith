/**
 * Stub GitHubCodespaceService for creating codespaces.
 */
export class GitHubCodespaceService {
  constructor(private token: string) {}

  async createCodespace(opts: { owner: string; repo: string; branch: string; displayName: string }): Promise<{ id: string; url: string; status: string }> {
    return { id: `codespace-${Date.now()}`, url: `https://github.com/codespaces/${opts.owner}/${opts.repo}`, status: "provisioned" };
  }
}
