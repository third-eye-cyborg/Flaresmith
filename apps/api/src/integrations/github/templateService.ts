/**
 * Stub GitHubTemplateService for cloning template repository and initializing spec files.
 */
export class GitHubTemplateService {
  constructor(private token: string) {}

  async cloneTemplate(opts: { templateOwner: string; templateRepo: string; targetOwner: string; targetRepo: string; description?: string }): Promise<{ fullName: string; cloneUrl: string }> {
    const fullName = `${opts.targetOwner}/${opts.targetRepo}`;
    return { fullName, cloneUrl: `https://github.com/${fullName}.git` };
  }

  async initializeSpecFiles(owner: string, repo: string, slug: string, branch: string): Promise<void> {
    // TODO: Add initial spec documents into repository
  }
}
