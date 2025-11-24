/**
 * T046: Cloudflare Workers/Pages provisioning service
 * Handles deployment of Workers and Pages with idempotent behavior
 */

export interface DeployWorkerInput {
  accountId: string;
  name: string;
  script: string;
  bindings?: Record<string, any>;
}

export interface DeployWorkerOutput {
  workerId: string;
  url: string;
  subdomain: string;
}

export interface DeployPagesInput {
  accountId: string;
  projectName: string;
  branch?: string;
  buildCommand?: string;
  outputDirectory?: string;
}

export interface DeployPagesOutput {
  projectId: string;
  url: string;
  deploymentId: string;
}

export class CloudflareDeployService {
  private apiToken: string;
  private baseUrl = "https://api.cloudflare.com/client/v4";

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  async deployWorker(input: DeployWorkerInput): Promise<DeployWorkerOutput> {
    const { accountId, name, script, bindings = {} } = input;

    try {
      // Check if worker already exists (idempotent)
      try {
        const existing = await this.getWorker(accountId, name);
        if (existing) {
          return existing;
        }
      } catch (error: any) {
        // Worker doesn't exist, proceed with deployment
      }

      // Deploy worker
      const formData = new FormData();
      formData.append("metadata", JSON.stringify({ body_part: "script", bindings }));
      formData.append("script", new Blob([script], { type: "application/javascript" }), "worker.js");

      const response = await fetch(`${this.baseUrl}/accounts/${accountId}/workers/scripts/${name}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Cloudflare Worker deployment failed: ${error.errors?.[0]?.message || response.statusText}`);
      }

      const data = await response.json();
      const subdomain = `${name}.workers.dev`;

      return {
        workerId: data.result.id,
        url: `https://${subdomain}`,
        subdomain,
      };
    } catch (error: any) {
      throw new Error(`Cloudflare Worker deployment failed: ${error.message}`);
    }
  }

  async deployPages(input: DeployPagesInput): Promise<DeployPagesOutput> {
    const { accountId, projectName, branch = "main" } = input;

    try {
      // Check if project already exists (idempotent)
      try {
        const existing = await this.getPagesProject(accountId, projectName);
        if (existing) {
          return {
            projectId: existing.id,
            url: existing.url,
            deploymentId: existing.latestDeploymentId || "",
          };
        }
      } catch (error: any) {
        // Project doesn't exist, proceed with creation
      }

      // Create Pages project
      const response = await fetch(`${this.baseUrl}/accounts/${accountId}/pages/projects`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName,
          production_branch: branch,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Cloudflare Pages deployment failed: ${error.errors?.[0]?.message || response.statusText}`);
      }

      const data = await response.json();
      const project = data.result;

      return {
        projectId: project.id,
        url: `https://${projectName}.pages.dev`,
        deploymentId: project.latest_deployment?.id || "",
      };
    } catch (error: any) {
      throw new Error(`Cloudflare Pages deployment failed: ${error.message}`);
    }
  }

  async getWorker(accountId: string, name: string): Promise<DeployWorkerOutput | null> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts/${accountId}/workers/scripts/${name}`, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Cloudflare Worker fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      const subdomain = `${name}.workers.dev`;

      return {
        workerId: data.result.id,
        url: `https://${subdomain}`,
        subdomain,
      };
    } catch (error: any) {
      throw new Error(`Cloudflare Worker fetch failed: ${error.message}`);
    }
  }

  async getPagesProject(accountId: string, projectName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts/${accountId}/pages/projects/${projectName}`, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Cloudflare Pages fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      const project = data.result;

      return {
        id: project.id,
        name: project.name,
        url: `https://${project.name}.pages.dev`,
        latestDeploymentId: project.latest_deployment?.id,
      };
    } catch (error: any) {
      throw new Error(`Cloudflare Pages fetch failed: ${error.message}`);
    }
  }

  async deleteWorker(accountId: string, name: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts/${accountId}/workers/scripts/${name}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Cloudflare Worker deletion failed: ${response.statusText}`);
      }
    } catch (error: any) {
      throw new Error(`Cloudflare Worker deletion failed: ${error.message}`);
    }
  }

  async deletePagesProject(accountId: string, projectName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts/${accountId}/pages/projects/${projectName}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Cloudflare Pages deletion failed: ${response.statusText}`);
      }
    } catch (error: any) {
      throw new Error(`Cloudflare Pages deletion failed: ${error.message}`);
    }
  }
}
