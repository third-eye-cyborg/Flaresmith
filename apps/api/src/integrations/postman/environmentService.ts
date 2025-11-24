/**
 * Postman Environment Service
 * 
 * Queries environment status from Postman API for environment dashboard
 */

interface PostmanEnvironmentStatus {
  environmentId?: string;
  status: "synced" | "outdated" | "error" | "none";
  lastSyncedAt?: string;
}

export class PostmanEnvironmentService {
  private apiKey: string;
  private workspaceId: string;

  constructor(apiKey: string, workspaceId: string) {
    this.apiKey = apiKey;
    this.workspaceId = workspaceId;
  }

  async getEnvironmentStatus(environmentName: string): Promise<PostmanEnvironmentStatus> {
    try {
      // List all environments in workspace
      const response = await fetch(
        `https://api.getpostman.com/environments`,
        {
          headers: {
            "X-Api-Key": this.apiKey,
          },
        }
      );

      if (!response.ok) {
        return { status: "error" };
      }

      const data = await response.json() as any;
      
      // Find environment by name
      const environment = data.environments?.find((env: any) => 
        env.name === environmentName || 
        env.name.includes(environmentName)
      );

      if (!environment) {
        return { status: "none" };
      }

      // Get detailed environment info
      const detailResponse = await fetch(
        `https://api.getpostman.com/environments/${environment.uid}`,
        {
          headers: {
            "X-Api-Key": this.apiKey,
          },
        }
      );

      if (!detailResponse.ok) {
        return {
          environmentId: environment.uid,
          status: "error",
        };
      }

      const detailData = await detailResponse.json() as any;
      const env = detailData.environment;

      // Check if environment was updated recently (within last 7 days)
      const updatedAt = new Date(env.updatedAt);
      const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      const isOutdated = daysSinceUpdate > 7;

      return {
        environmentId: env.uid,
        status: isOutdated ? "outdated" : "synced",
        lastSyncedAt: env.updatedAt,
      };
    } catch (error) {
      console.error(`Error fetching Postman environment status for ${environmentName}:`, error);
      return { status: "error" };
    }
  }
}
