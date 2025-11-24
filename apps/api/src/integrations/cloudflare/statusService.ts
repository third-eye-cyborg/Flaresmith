/**
 * Cloudflare Status Service
 * 
 * Queries deployment status from Cloudflare Workers/Pages for environment dashboard
 */

interface CloudflareDeploymentStatus {
  deploymentId?: string;
  url?: string;
  status: "deployed" | "deploying" | "failed" | "none" | "error";
  lastDeployedAt?: string;
}

export class CloudflareStatusService {
  private apiToken: string;
  private accountId: string;

  constructor(apiToken: string, accountId: string) {
    this.apiToken = apiToken;
    this.accountId = accountId;
  }

  async getWorkerDeploymentStatus(workerName: string): Promise<CloudflareDeploymentStatus> {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/workers/scripts/${workerName}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { status: "none" };
        }
        return { status: "error" };
      }

      const data = await response.json() as any;
      
      return {
        deploymentId: data.result?.id,
        status: "deployed",
        lastDeployedAt: data.result?.modified_on,
      };
    } catch (error) {
      console.error(`Error fetching Cloudflare Worker status for ${workerName}:`, error);
      return { status: "error" };
    }
  }

  async getPageDeploymentStatus(projectName: string, environment: string): Promise<CloudflareDeploymentStatus> {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/pages/projects/${projectName}/deployments`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { status: "none" };
        }
        return { status: "error" };
      }

      const data = await response.json() as any;
      
      // Find latest deployment for this environment
      const envDeployments = data.result?.filter((d: any) => 
        d.deployment_trigger?.metadata?.branch === environment ||
        d.environment === environment
      ) || [];

      if (envDeployments.length === 0) {
        return { status: "none" };
      }

      const latestDeployment = envDeployments[0];
      
      // Map Cloudflare status to our status
      let status: "deployed" | "deploying" | "failed" | "none" = "none";
      if (latestDeployment.latest_stage?.status === "success") {
        status = "deployed";
      } else if (latestDeployment.latest_stage?.status === "active") {
        status = "deploying";
      } else if (latestDeployment.latest_stage?.status === "failure") {
        status = "failed";
      }

      return {
        deploymentId: latestDeployment.id,
        url: latestDeployment.url,
        status,
        lastDeployedAt: latestDeployment.created_on,
      };
    } catch (error) {
      console.error(`Error fetching Cloudflare Pages status for ${projectName}:`, error);
      return { status: "error" };
    }
  }
}
