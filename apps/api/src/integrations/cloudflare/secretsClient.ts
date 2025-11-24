/**
 * Cloudflare Secrets API Client
 * Manages secrets for Cloudflare Workers and Pages projects
 * 
 * T020 Extension: Cloudflare secret store synchronization
 * Integrates with GitHub secret sync to automatically populate Cloudflare secrets
 */

export interface CloudflareSecret {
  name: string;
  type: 'secret_text' | 'secret_key';
}

export interface SetWorkerSecretInput {
  accountId: string;
  scriptName: string;
  secretName: string;
  secretValue: string;
}

export interface SetPagesSecretInput {
  accountId: string;
  projectName: string;
  secretName: string;
  secretValue: string;
  environment?: 'production' | 'preview';
}

export interface DeleteSecretInput {
  accountId: string;
  scriptName?: string;
  projectName?: string;
  secretName: string;
}

export class CloudflareSecretsClient {
  private apiToken: string;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * Set a secret for a Cloudflare Worker
   * Idempotent - overwrites existing secret with same name
   */
  async setWorkerSecret(input: SetWorkerSecretInput): Promise<void> {
    const { accountId, scriptName, secretName, secretValue } = input;

    try {
      const response = await fetch(
        `${this.baseUrl}/accounts/${accountId}/workers/scripts/${scriptName}/secrets`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: secretName,
            text: secretValue,
            type: 'secret_text',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(
          `Cloudflare Worker secret write failed: ${error.errors?.[0]?.message || response.statusText}`
        );
      }
    } catch (error: any) {
      throw new Error(`Cloudflare Worker secret write failed: ${error.message}`);
    }
  }

  /**
   * Set a secret for a Cloudflare Pages project
   * Idempotent - overwrites existing secret with same name
   */
  async setPagesSecret(input: SetPagesSecretInput): Promise<void> {
    const { accountId, projectName, secretName, secretValue, environment = 'production' } = input;

    try {
      const response = await fetch(
        `${this.baseUrl}/accounts/${accountId}/pages/projects/${projectName}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deployment_configs: {
              [environment]: {
                env_vars: {
                  [secretName]: {
                    type: 'secret_text',
                    value: secretValue,
                  },
                },
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(
          `Cloudflare Pages secret write failed: ${error.errors?.[0]?.message || response.statusText}`
        );
      }
    } catch (error: any) {
      throw new Error(`Cloudflare Pages secret write failed: ${error.message}`);
    }
  }

  /**
   * List secrets for a Cloudflare Worker
   * Note: Values are never returned, only metadata
   */
  async listWorkerSecrets(accountId: string, scriptName: string): Promise<CloudflareSecret[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/accounts/${accountId}/workers/scripts/${scriptName}/secrets`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(
          `Cloudflare Worker secrets list failed: ${error.errors?.[0]?.message || response.statusText}`
        );
      }

      const data = await response.json() as any;
      return data.result || [];
    } catch (error: any) {
      throw new Error(`Cloudflare Worker secrets list failed: ${error.message}`);
    }
  }

  /**
   * Delete a secret from a Cloudflare Worker
   */
  async deleteWorkerSecret(accountId: string, scriptName: string, secretName: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/accounts/${accountId}/workers/scripts/${scriptName}/secrets/${secretName}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
          },
        }
      );

      if (!response.ok && response.status !== 404) {
        const error = await response.json() as any;
        throw new Error(
          `Cloudflare Worker secret delete failed: ${error.errors?.[0]?.message || response.statusText}`
        );
      }
    } catch (error: any) {
      throw new Error(`Cloudflare Worker secret delete failed: ${error.message}`);
    }
  }

  /**
   * Bulk set secrets for a Worker (optimized for sync operations)
   */
  async bulkSetWorkerSecrets(
    accountId: string,
    scriptName: string,
    secrets: Array<{ name: string; value: string }>
  ): Promise<{ successCount: number; failureCount: number; errors: Array<{ name: string; error: string }> }> {
    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as Array<{ name: string; error: string }>,
    };

    for (const secret of secrets) {
      try {
        await this.setWorkerSecret({
          accountId,
          scriptName,
          secretName: secret.name,
          secretValue: secret.value,
        });
        results.successCount++;
      } catch (error: any) {
        results.failureCount++;
        results.errors.push({
          name: secret.name,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Bulk set secrets for a Pages project (optimized for sync operations)
   */
  async bulkSetPagesSecrets(
    accountId: string,
    projectName: string,
    secrets: Array<{ name: string; value: string }>,
    environment: 'production' | 'preview' = 'production'
  ): Promise<{ successCount: number; failureCount: number; errors: Array<{ name: string; error: string }> }> {
    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as Array<{ name: string; error: string }>,
    };

    // Cloudflare Pages requires single PATCH with all env vars
    // Build complete env vars object
    const envVars: Record<string, { type: string; value: string }> = {};
    
    for (const secret of secrets) {
      envVars[secret.name] = {
        type: 'secret_text',
        value: secret.value,
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/accounts/${accountId}/pages/projects/${projectName}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deployment_configs: {
              [environment]: {
                env_vars: envVars,
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(
          `Cloudflare Pages bulk secrets write failed: ${error.errors?.[0]?.message || response.statusText}`
        );
      }

      results.successCount = secrets.length;
    } catch (error: any) {
      results.failureCount = secrets.length;
      for (const secret of secrets) {
        results.errors.push({
          name: secret.name,
          error: error.message,
        });
      }
    }

    return results;
  }
}
