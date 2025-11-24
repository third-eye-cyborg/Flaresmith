// T035: API client resource for credential records
import { CredentialRecord, CredentialActionRequest, CredentialActionResult } from '@packages/types/src/design-sync/credentials';

export class DesignCredentialsApiClient {
  constructor(private baseUrl: string) {}

  async list(): Promise<CredentialRecord[]> {
    const res = await fetch(`${this.baseUrl}/design-sync/credentials`);
    if (!res.ok) throw new Error(`List credentials failed: ${res.status}`);
    return res.json();
  }

  async action(req: CredentialActionRequest): Promise<CredentialActionResult> {
    const res = await fetch(`${this.baseUrl}/design-sync/credentials/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`Credential action failed: ${res.status}`);
    return res.json();
  }
}
import { CloudMakeClient } from '../client';
import { CredentialListResponse, CredentialActionRequest, CredentialActionResult } from '@flaresmith/types/src/design-sync/credentials';

/**
 * DesignCredentialsResource (T035)
 * Client for credential governance endpoints.
 */
export class DesignCredentialsResource {
  constructor(private client: CloudMakeClient) {}

  async list(): Promise<ReturnType<typeof CredentialListResponse.parse>> {
    return this.client.get('/design-sync/credentials', CredentialListResponse);
  }

  async action(request: CredentialActionRequest): Promise<CredentialActionResult> {
    return this.client.post('/design-sync/credentials/action', CredentialActionResult, request);
  }
}
