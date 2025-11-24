// T036: API client resource for browser session operations
import { BrowserSessionStartRequest, BrowserSessionStatusResponse } from '@packages/types/src/design-sync/browserSession';

export class DesignBrowserSessionApiClient {
  constructor(private baseUrl: string) {}

  async start(req: BrowserSessionStartRequest): Promise<BrowserSessionStatusResponse> {
    const res = await fetch(`${this.baseUrl}/design-sync/browser/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`Browser session start failed: ${res.status}`);
    return res.json();
  }

  async status(sessionId: string): Promise<BrowserSessionStatusResponse> {
    const res = await fetch(`${this.baseUrl}/design-sync/browser/session/${sessionId}`);
    if (!res.ok) throw new Error(`Browser session status failed: ${res.status}`);
    return res.json();
  }
}
import { CloudMakeClient } from '../client';
import { BrowserSessionStartRequest, BrowserSessionStartResponse, BrowserSessionStatusResponse } from '@flaresmith/types/src/design-sync/browserSession';

/**
 * DesignBrowserSessionResource (T036)
 * Client for browser MCP testing session lifecycle.
 */
export class DesignBrowserSessionResource {
  constructor(private client: CloudMakeClient) {}

  /** Start a browser test session */
  async start(storyId: string, authProfile?: string): Promise<BrowserSessionStartResponse> {
    const payload: BrowserSessionStartRequest = { storyId, authProfile } as any;
    return this.client.post('/design-sync/browser-session', BrowserSessionStartResponse, payload);
  }

  /** Poll status for a session */
  async status(sessionId: string): Promise<BrowserSessionStatusResponse> {
    return this.client.get(`/design-sync/browser-session/${sessionId}`, BrowserSessionStatusResponse);
  }
}
