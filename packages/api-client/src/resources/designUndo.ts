// T033: API client resource for undo operations
import { UndoRequest, UndoResult } from '@packages/types/src/design-sync/undo';

export class DesignUndoApiClient {
  constructor(private baseUrl: string) {}

  async undo(req: UndoRequest): Promise<UndoResult> {
    const res = await fetch(`${this.baseUrl}/design-sync/undo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`Undo failed: ${res.status}`);
    return res.json();
  }
}
import { CloudMakeClient } from '../client';
import { UndoResult } from '@flaresmith/types/src/design-sync/undo';
import { z } from 'zod';

/**
 * DesignUndoResource (T033)
 * Client for undo operations.
 */
export class DesignUndoResource {
  constructor(private client: CloudMakeClient) {}

  async undo(operationId: string): Promise<UndoResult> {
    const payload = { operationId };
    // Simple inline schema to validate payload shape
    z.object({ operationId: z.string().uuid() }).parse(payload);
    return this.client.post('/design-sync/undo', UndoResult, payload);
  }
}
