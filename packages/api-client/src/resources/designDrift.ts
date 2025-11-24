// T032: API client resource for drift detection
import { DriftSummary } from '@packages/types/src/design-sync/drift';

export class DesignDriftApiClient {
  constructor(private baseUrl: string) {}

  async getDrift(): Promise<DriftSummary> {
    const res = await fetch(`${this.baseUrl}/design-sync/drift`);
    if (!res.ok) throw new Error(`Drift endpoint failed: ${res.status}`);
    return res.json();
  }
}
import { CloudMakeClient } from '../client';
import { DriftSummary } from '@flaresmith/types/src/design-sync/drift';

/**
 * DesignDriftResource (T032)
 * Dedicated client for drift detection endpoints.
 */
export class DesignDriftResource {
  constructor(private client: CloudMakeClient) {}

  /** Fetch current drift summary */
  async getDrift(): Promise<DriftSummary> {
    return this.client.get('/design-sync/drift', DriftSummary);
  }
}
