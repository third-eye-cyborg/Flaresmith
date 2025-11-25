/**
 * Stub CloudflareStatusService for retrieving Pages deployment status.
 */
export class CloudflareStatusService {
  constructor(private apiToken: string, private accountId: string) {}

  async getPageDeploymentStatus(projectId: string, environmentName: string): Promise<{ latestDeploymentId?: string; status: string; url?: string }> {
    return { status: "unknown", url: `https://${environmentName}.${projectId}.pages.dev` };
  }
}
