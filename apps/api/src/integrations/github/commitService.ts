/**
 * Stub GitHubCommitService (spec-first placeholder)
 * Provides minimal commitFiles method returning a fake SHA for local dev until real implementation.
 */
export class GitHubCommitService {
  constructor(private token: string) {}

  async commitFiles(opts: { owner: string; repo: string; branch: string; message: string; changes: Array<{ path: string; content: string }>; expectedBaseSha?: string }): Promise<{ commitSha: string }> {
    // TODO: Implement via GitHub REST API (repos/contents + create commit) respecting optimistic locking
    const fakeSha = `stub-${Date.now().toString(36)}`;
    return { commitSha: fakeSha };
  }
}
