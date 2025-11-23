/**
 * T045: Neon integration service for project and branch creation
 * Handles Neon Postgres project and branch provisioning with idempotent behavior
 */

export interface CreateNeonProjectInput {
  name: string;
  region?: string;
}

export interface CreateNeonProjectOutput {
  projectId: string;
  connectionString: string;
  defaultBranch: string;
}

export interface CreateNeonBranchInput {
  projectId: string;
  name: string;
  parentBranchId?: string;
}

export interface CreateNeonBranchOutput {
  branchId: string;
  name: string;
  connectionString: string;
}

export class NeonProjectService {
  private apiKey: string;
  private baseUrl = "https://console.neon.tech/api/v2";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createProject(input: CreateNeonProjectInput): Promise<CreateNeonProjectOutput> {
    const { name, region = "us-east-1" } = input;

    try {
      // List existing projects to check for duplicates (idempotent)
      const projects = await this.listProjects();
      const existing = projects.find((p) => p.name === name);

      if (existing) {
        return {
          projectId: existing.id,
          connectionString: existing.connectionString,
          defaultBranch: existing.defaultBranch,
        };
      }

      // Create new project
      const response = await fetch(`${this.baseUrl}/projects`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: {
            name,
            region_id: region,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(`Neon project creation failed: ${error.message || response.statusText}`);
      }

      const data = await response.json() as any;
      const project = data.project;
      const defaultBranch = data.branch;
      const connectionUri = data.connection_uris?.[0]?.connection_uri || "";

      return {
        projectId: project.id,
        connectionString: connectionUri,
        defaultBranch: defaultBranch.id,
      };
    } catch (error: any) {
      throw new Error(`Neon project creation failed: ${error.message}`);
    }
  }

  async createBranch(input: CreateNeonBranchInput): Promise<CreateNeonBranchOutput> {
    const { projectId, name, parentBranchId } = input;

    try {
      // List existing branches to check for duplicates (idempotent)
      const branches = await this.listBranches(projectId);
      const existing = branches.find((b) => b.name === name);

      if (existing) {
        return {
          branchId: existing.id,
          name: existing.name,
          connectionString: existing.connectionString || "",
        };
      }

      // Create new branch
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/branches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch: {
            name,
            parent_id: parentBranchId,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(`Neon branch creation failed: ${error.message || response.statusText}`);
      }

      const data = await response.json() as any;
      const branch = data.branch;
      const connectionUri = data.connection_uris?.[0]?.connection_uri || "";

      return {
        branchId: branch.id,
        name: branch.name,
        connectionString: connectionUri,
      };
    } catch (error: any) {
      throw new Error(`Neon branch creation failed: ${error.message}`);
    }
  }

  async getBranch(projectId: string, branchId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/branches/${branchId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Neon branch fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.branch;
    } catch (error: any) {
      throw new Error(`Neon branch fetch failed: ${error.message}`);
    }
  }

  async deleteBranch(projectId: string, branchId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/branches/${branchId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Neon branch deletion failed: ${response.statusText}`);
      }
    } catch (error: any) {
      throw new Error(`Neon branch deletion failed: ${error.message}`);
    }
  }

  private async listProjects(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/projects`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Neon projects list failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        connectionString: p.connection_uri || "",
        defaultBranch: p.default_branch_id,
      }));
    } catch (error: any) {
      throw new Error(`Neon projects list failed: ${error.message}`);
    }
  }

  private async listBranches(projectId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/branches`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Neon branches list failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.branches.map((b: any) => ({
        id: b.id,
        name: b.name,
        connectionString: b.connection_uri || "",
      }));
    } catch (error: any) {
      throw new Error(`Neon branches list failed: ${error.message}`);
    }
  }
}
