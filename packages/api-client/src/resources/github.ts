/**
 * T029: GitHub Secrets API Client
 * Typed API wrapper for GitHub secret synchronization endpoints
 */

import { CloudMakeClient } from '../client';
import {
  SecretSyncRequestSchema,
  SecretSyncResponseSchema,
  SecretSyncStatusResponseSchema,
  type SecretSyncRequest,
  type SecretSyncResponse,
  type SecretSyncStatusResponse,
} from '@flaresmith/types';

export class GitHubResource {
  constructor(private client: CloudMakeClient) {}

  /**
   * Sync secrets across GitHub scopes and Cloudflare
   * POST /github/secrets/sync
   */
  async syncSecrets(request: SecretSyncRequest): Promise<SecretSyncResponse> {
    return this.client.post('/github/secrets/sync', SecretSyncResponseSchema, request);
  }

  /**
   * Get secret synchronization status for a project
   * GET /github/secrets/sync/status?projectId={id}
   */
  async getSecretSyncStatus(projectId: string): Promise<SecretSyncStatusResponse> {
    return this.client.get(
      `/github/secrets/sync/status?projectId=${encodeURIComponent(projectId)}`,
      SecretSyncStatusResponseSchema
    );
  }
}
