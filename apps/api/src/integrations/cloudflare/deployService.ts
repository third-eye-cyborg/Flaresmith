/**
 * Stub CloudflareDeployService for Pages deployment operations.
 */
export class CloudflareDeployService {
  constructor(private apiToken: string) {}

  async deployPages(opts: { accountId: string; projectName: string; branch: string }): Promise<{ projectId: string; url: string }> {
    return { projectId: `pages-${opts.projectName}`, url: `https://${opts.projectName}.pages.dev` };
  }
}
