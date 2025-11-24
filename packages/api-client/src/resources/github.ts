/**
 * T029: GitHub Secrets API Client
 * Typed API wrapper for GitHub secret synchronization endpoints
 */

import { CloudMakeClient } from '../client';
import {
  SecretSyncResponseSchema,
  SecretSyncStatusResponseSchema,
  SecretValidationResponseSchema,
  CreateEnvironmentsResponseSchema,
  SecretSyncRequestSchema,
  SecretValidationRequestSchema,
  CreateEnvironmentsRequestSchema,
  type SecretSyncRequest,
  type SecretSyncResponse,
  type SecretSyncStatusResponse,
  type SecretValidationRequest,
  type SecretValidationResponse,
  type CreateEnvironmentsRequest,
  type CreateEnvironmentsResponse,
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

  /**
   * Validate secrets presence & conflicts
   * POST /github/secrets/validate
   */
  async validateSecrets(request: SecretValidationRequest): Promise<SecretValidationResponse> {
    return this.client.post('/github/secrets/validate', SecretValidationResponseSchema, request);
  }

  /**
   * Create GitHub environments with protection rules and secrets
   * POST /github/environments
   */
  async createEnvironments(request: CreateEnvironmentsRequest): Promise<CreateEnvironmentsResponse> {
    return this.client.post('/github/environments', CreateEnvironmentsResponseSchema, request);
  }
}

  /**
   * Create GitHub environments with protection rules and secrets
   * POST /github/environments
   */
  async createEnvironments(request: CreateEnvironmentsRequest): Promise<CreateEnvironmentsResponse> {
    return this.client.post('/github/environments', CreateEnvironmentsResponseSchema, request);
  }
