// T034: API client resource for coverage reports
import { CoverageSummary } from '@packages/types/src/design-sync/coverage';

export class DesignCoverageApiClient {
  constructor(private baseUrl: string) {}

  async getCoverage(): Promise<CoverageSummary> {
    const res = await fetch(`${this.baseUrl}/design-sync/coverage`);
    if (!res.ok) throw new Error(`Coverage failed: ${res.status}`);
    return res.json();
  }
}
import { CloudMakeClient } from '../client';
import { CoverageReport } from '@flaresmith/types/src/design-sync/coverage';
import { z } from 'zod';

/**
 * DesignCoverageResource (T034)
 * Client for coverage reporting endpoints.
 */
export class DesignCoverageResource {
  constructor(private client: CloudMakeClient) {}

  /** Fetch coverage for all components */
  async list(): Promise<CoverageReport[]> {
    return this.client.get('/design-sync/coverage', z.array(CoverageReport));
  }

  /** Fetch coverage for a single component */
  async get(componentId: string): Promise<CoverageReport> {
    return this.client.get(`/design-sync/coverage?componentId=${componentId}`, CoverageReport);
  }
}
