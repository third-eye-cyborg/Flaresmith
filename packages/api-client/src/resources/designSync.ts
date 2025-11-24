// T031: API client resource for design sync operations
import { ExecuteSyncInput, SyncOperationResult } from '@packages/types/src/design-sync/syncOperation';
import { DriftSummary } from '@packages/types/src/design-sync/drift';
import { UndoRequest, UndoResult } from '@packages/types/src/design-sync/undo';
import { CoverageSummary } from '@packages/types/src/design-sync/coverage';
import { CredentialActionRequest, CredentialActionResult, CredentialRecord } from '@packages/types/src/design-sync/credentials';
import { BrowserSessionStartRequest, BrowserSessionStatusResponse } from '@packages/types/src/design-sync/browserSession';

export class DesignSyncApiClient {
  constructor(private baseUrl: string) {}

  async executeSync(input: ExecuteSyncInput): Promise<SyncOperationResult> {
    const res = await fetch(`${this.baseUrl}/design-sync/operations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
    return res.json();
  }

  async getDrift(): Promise<DriftSummary> {
    const res = await fetch(`${this.baseUrl}/design-sync/drift`);
    if (!res.ok) throw new Error('Drift check failed');
    return res.json();
  }

  async undo(input: UndoRequest): Promise<UndoResult> {
    const res = await fetch(`${this.baseUrl}/design-sync/undo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Undo failed');
    return res.json();
  }

  async getCoverage(): Promise<CoverageSummary> {
    const res = await fetch(`${this.baseUrl}/design-sync/coverage`);
    if (!res.ok) throw new Error('Coverage failed');
    return res.json();
  }

  async listCredentials(): Promise<CredentialRecord[]> {
    const res = await fetch(`${this.baseUrl}/design-sync/credentials`);
    if (!res.ok) throw new Error('Credentials list failed');
    return res.json();
  }

  async credentialAction(req: CredentialActionRequest): Promise<CredentialActionResult> {
    const res = await fetch(`${this.baseUrl}/design-sync/credentials/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error('Credential action failed');
    return res.json();
  }

  async startBrowserSession(req: BrowserSessionStartRequest): Promise<BrowserSessionStatusResponse> {
    const res = await fetch(`${this.baseUrl}/design-sync/browser/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error('Browser session start failed');
    return res.json();
  }

  async getBrowserSessionStatus(sessionId: string): Promise<BrowserSessionStatusResponse> {
    const res = await fetch(`${this.baseUrl}/design-sync/browser/session/${sessionId}`);
    if (!res.ok) throw new Error('Browser session status failed');
    return res.json();
  }
}
import { CloudMakeClient } from '../client';
import { z } from 'zod';
import {
  ExecuteSyncInput,
  SyncOperationResult,
} from '@flaresmith/types/src/design-sync/syncOperation';
import { DriftSummary } from '@flaresmith/types/src/design-sync/drift';
import { UndoRequest, UndoResult } from '@flaresmith/types/src/design-sync/undo';
import { CoverageReport } from '@flaresmith/types/src/design-sync/coverage';
import {
  CredentialActionRequest,
  CredentialActionResult,
  CredentialListResponse,
} from '@flaresmith/types/src/design-sync/credentials';
import { BrowserSession, BrowserSessionStartRequest, BrowserSessionStatusResponse } from '@flaresmith/types/src/design-sync/browserSession';

/**
 * DesignSyncResource (T031)
 * API client facade for Design Sync & Integration Hub endpoints.
 * Endpoints are spec-aligned but may be stubbed until route implementations (Phase 3+).
 */
export class DesignSyncResource {
  constructor(private client: CloudMakeClient) {}

  /** Execute a design sync operation (manual trigger). */
  async executeSync(input: ExecuteSyncInput): Promise<SyncOperationResult> {
    // Validate locally before sending
    const ExecuteSyncInputSchema = z.any(); // TODO: refine with actual zod schema re-export
    ExecuteSyncInputSchema.parse(input);
    return this.client.post('/design-sync/operations', SyncOperationResult, input);
  }

  /** Retrieve current drift summary (pre-flight before sync). */
  async getDrift(): Promise<DriftSummary> {
    return this.client.get('/design-sync/drift', DriftSummary);
  }

  /** Undo a prior sync operation (within window). */
  async undo(operationId: string): Promise<UndoResult> {
    const payload: UndoRequest = { operationId } as any;
    return this.client.post('/design-sync/undo', UndoResult, payload);
  }

  /** Fetch coverage report for a component or all (if componentId omitted). */
  async getCoverage(componentId?: string): Promise<CoverageReport | CoverageReport[]> {
    if (componentId) {
      return this.client.get(`/design-sync/coverage?componentId=${componentId}`, CoverageReport);
    }
    // Simplified array fetch (pending formal spec contract list schema)
    return this.client.get('/design-sync/coverage', z.array(CoverageReport));
  }

  /** List credential records. */
  async listCredentials(): Promise<ReturnType<typeof CredentialListResponse.parse>> {
    return this.client.get('/design-sync/credentials', CredentialListResponse);
  }

  /** Perform credential action (validate/rotate/revoke). */
  async credentialAction(req: CredentialActionRequest): Promise<CredentialActionResult> {
    return this.client.post('/design-sync/credentials/action', CredentialActionResult, req);
  }

  /** Start browser MCP test session for a story. */
  async startBrowserSession(storyId: string, options?: Omit<BrowserSessionStartRequest, 'storyId'>): Promise<BrowserSession> {
    const payload: BrowserSessionStartRequest = { storyId, authProfile: options?.authProfile, tags: options?.tags } as any;
    return this.client.post('/design-sync/browser-session', BrowserSession, payload);
  }

  /** Poll status for an existing browser test session. */
  async getBrowserSessionStatus(sessionId: string): Promise<BrowserSessionStatusResponse> {
    return this.client.get(`/design-sync/browser-session/${sessionId}`, BrowserSessionStatusResponse);
  }
}
