// T022: Service skeleton for browser test sessions via MCP
import { BrowserSessionStartRequest, BrowserSessionStatusResponse } from '@packages/types/src/design-sync/browserSession';
import { designSyncLogger } from '../lib/designSyncLogger';

export class BrowserTestService {
  async startSession(req: BrowserSessionStartRequest): Promise<BrowserSessionStatusResponse> {
    const sessionId = crypto.randomUUID();
    designSyncLogger.info({ action: 'browserSessionStart', correlationId: req.correlationId, operationId: sessionId, status: 'started' });
    return {
      sessionId,
      storyId: req.storyId,
      status: 'running',
      performanceSummary: undefined,
      startedAt: new Date().toISOString(),
      endedAt: undefined,
    };
  }

  async getStatus(sessionId: string): Promise<BrowserSessionStatusResponse> {
    // Placeholder always running
    return {
      sessionId,
      storyId: crypto.randomUUID(),
      status: 'running',
      performanceSummary: {},
      startedAt: new Date().toISOString(),
      endedAt: undefined,
    };
  }
}

export const browserTestService = new BrowserTestService();
/**
 * T022: Service skeleton for browser MCP test sessions
 */
import { BrowserSessionStartRequest, BrowserSessionStartResponse, BrowserSessionStatusResponse } from '@flaresmith/types/design-sync/browserSession';
import { db } from '../../db/connection';
import { browserTestSessions } from '../../db/schema/designSync';
import { eq } from 'drizzle-orm';

export class BrowserTestService {
  async start(req: BrowserSessionStartRequest): Promise<BrowserSessionStartResponse> {
    const startedAt = new Date();
    const sessionId = crypto.randomUUID();
    // Placeholder insert
    await db.insert(browserTestSessions).values({
      id: sessionId,
      storyId: req.storyId,
      correlationId: crypto.randomUUID(),
      status: 'running',
      startTime: startedAt.toISOString() as any,
    });
    return { sessionId, status: 'running', startedAt: startedAt.toISOString() };
  }

  async status(sessionId: string): Promise<BrowserSessionStatusResponse | null> {
    // Placeholder query - would normally fetch real row
    return null;
  }
}

export const browserTestService = new BrowserTestService();
