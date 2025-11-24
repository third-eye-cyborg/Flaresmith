/**
 * Neon Status Service
 * 
 * Queries branch status from Neon Postgres API for environment dashboard
 */

interface NeonBranchStatus {
  branchId?: string;
  status: "active" | "creating" | "error" | "none";
  computeStatus?: "active" | "idle" | "suspended";
}

export class NeonStatusService {
  private apiKey: string;
  private projectId: string;

  constructor(apiKey: string, projectId: string) {
    this.apiKey = apiKey;
    this.projectId = projectId;
  }

  async getBranchStatus(branchName: string): Promise<NeonBranchStatus> {
    try {
      const response = await fetch(
        `https://console.neon.tech/api/v2/projects/${this.projectId}/branches`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        return { status: "error" };
      }

      const data = await response.json() as any;
      
      // Find branch by name
      const branch = data.branches?.find((b: any) => b.name === branchName);

      if (!branch) {
        return { status: "none" };
      }

      // Get compute endpoint status for this branch
      const computeResponse = await fetch(
        `https://console.neon.tech/api/v2/projects/${this.projectId}/endpoints`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      let computeStatus: "active" | "idle" | "suspended" | undefined;

      if (computeResponse.ok) {
        const computeData = await computeResponse.json() as any;
        const endpoint = computeData.endpoints?.find((e: any) => e.branch_id === branch.id);
        
        if (endpoint) {
          // Map Neon compute states to our states
          if (endpoint.disabled) {
            computeStatus = "suspended";
          } else if (endpoint.last_active) {
            const lastActive = new Date(endpoint.last_active);
            const minutesSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60);
            computeStatus = minutesSinceActive > 5 ? "idle" : "active";
          } else {
            computeStatus = "idle";
          }
        }
      }

      return {
        branchId: branch.id,
        status: branch.current_state === "ready" ? "active" : "creating",
        computeStatus,
      };
    } catch (error) {
      console.error(`Error fetching Neon branch status for ${branchName}:`, error);
      return { status: "error" };
    }
  }
}
