/**
 * T047: Postman workspace and collection creation service
 * Handles Postman workspace/collection provisioning with hybrid structure per FR-029
 */

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  type?: "personal" | "team";
}

export interface CreateWorkspaceOutput {
  workspaceId: string;
  name: string;
}

export interface CreateCollectionInput {
  workspaceId: string;
  name: string;
  description?: string;
  schema?: any;
}

export interface CreateCollectionOutput {
  collectionId: string;
  name: string;
  uid: string;
}

export interface SyncCollectionInput {
  collectionId: string;
  schema: any;
}

export class PostmanWorkspaceService {
  private apiKey: string;
  private baseUrl = "https://api.postman.com";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createWorkspace(input: CreateWorkspaceInput): Promise<CreateWorkspaceOutput> {
    const { name, description, type = "team" } = input;

    try {
      // List existing workspaces to check for duplicates (idempotent)
      const workspaces = await this.listWorkspaces();
      const existing = workspaces.find((w) => w.name === name);

      if (existing) {
        return {
          workspaceId: existing.id,
          name: existing.name,
        };
      }

      // Create new workspace
      const response = await fetch(`${this.baseUrl}/workspaces`, {
        method: "POST",
        headers: {
          "X-Api-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace: {
            name,
            type,
            description,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Postman workspace creation failed: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const workspace = data.workspace;

      return {
        workspaceId: workspace.id,
        name: workspace.name,
      };
    } catch (error: any) {
      throw new Error(`Postman workspace creation failed: ${error.message}`);
    }
  }

  async createCollection(input: CreateCollectionInput): Promise<CreateCollectionOutput> {
    const { workspaceId, name, description, schema } = input;

    try {
      // Create new collection
      const response = await fetch(`${this.baseUrl}/collections`, {
        method: "POST",
        headers: {
          "X-Api-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collection: {
            info: {
              name,
              description,
              schema: schema || "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
            },
            item: [],
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Postman collection creation failed: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const collection = data.collection;

      // Add collection to workspace
      await this.addCollectionToWorkspace(workspaceId, collection.uid);

      return {
        collectionId: collection.id,
        name: collection.info.name,
        uid: collection.uid,
      };
    } catch (error: any) {
      throw new Error(`Postman collection creation failed: ${error.message}`);
    }
  }

  async syncCollection(input: SyncCollectionInput): Promise<void> {
    const { collectionId, schema } = input;

    try {
      const response = await fetch(`${this.baseUrl}/collections/${collectionId}`, {
        method: "PUT",
        headers: {
          "X-Api-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collection: schema,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Postman collection sync failed: ${error.error?.message || response.statusText}`);
      }
    } catch (error: any) {
      throw new Error(`Postman collection sync failed: ${error.message}`);
    }
  }

  async createEnvironment(workspaceId: string, name: string, values: Record<string, string>): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/environments`, {
        method: "POST",
        headers: {
          "X-Api-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          environment: {
            name,
            values: Object.entries(values).map(([key, value]) => ({
              key,
              value,
              enabled: true,
            })),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Postman environment creation failed: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const environment = data.environment;

      // Add environment to workspace
      await this.addEnvironmentToWorkspace(workspaceId, environment.uid);

      return environment.id;
    } catch (error: any) {
      throw new Error(`Postman environment creation failed: ${error.message}`);
    }
  }

  async getCollection(collectionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/collections/${collectionId}`, {
        headers: {
          "X-Api-Key": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Postman collection fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.collection;
    } catch (error: any) {
      throw new Error(`Postman collection fetch failed: ${error.message}`);
    }
  }

  async deleteCollection(collectionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/collections/${collectionId}`, {
        method: "DELETE",
        headers: {
          "X-Api-Key": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Postman collection deletion failed: ${response.statusText}`);
      }
    } catch (error: any) {
      throw new Error(`Postman collection deletion failed: ${error.message}`);
    }
  }

  private async listWorkspaces(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/workspaces`, {
        headers: {
          "X-Api-Key": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Postman workspaces list failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.workspaces.map((w: any) => ({
        id: w.id,
        name: w.name,
      }));
    } catch (error: any) {
      throw new Error(`Postman workspaces list failed: ${error.message}`);
    }
  }

  private async addCollectionToWorkspace(workspaceId: string, collectionUid: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/workspaces/${workspaceId}/collections`, {
        method: "PUT",
        headers: {
          "X-Api-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collection: {
            uid: collectionUid,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Add collection to workspace failed: ${error.error?.message || response.statusText}`);
      }
    } catch (error: any) {
      throw new Error(`Add collection to workspace failed: ${error.message}`);
    }
  }

  private async addEnvironmentToWorkspace(workspaceId: string, environmentUid: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/workspaces/${workspaceId}/environments`, {
        method: "PUT",
        headers: {
          "X-Api-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          environment: {
            uid: environmentUid,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Add environment to workspace failed: ${error.error?.message || response.statusText}`);
      }
    } catch (error: any) {
      throw new Error(`Add environment to workspace failed: ${error.message}`);
    }
  }
}
