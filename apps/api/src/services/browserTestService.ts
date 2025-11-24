// T084: Browser test service (extended from T022 skeleton)
// Feature: 006-design-sync-integration
// MCP browser session management with story linking and performance tracking
// Spec References: FR-018, US5

import { db } from '../../db/connection';
import { browserTestSessions } from '../../db/schema/designSync';
import { eq } from 'drizzle-orm';
import { designSyncLogger } from '../lib/designSyncLogger';

export interface BrowserSessionStartRequest {
  storyId: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface BrowserSessionStartResponse {
  sessionId: string;
  storyId: string;
  status: 'running';
  correlationId: string;
  startTime: string;
}

export interface BrowserSessionStatusResponse {
  sessionId: string;
  storyId: string;
  status: 'running' | 'passed' | 'failed' | 'aborted';
  startTime: string;
  endTime: string | null;
  performanceSummary: Record<string, unknown> | null;
  correlationId: string;
}

export class BrowserTestService {
  /**
   * Start a new browser test session linked to a Storybook story
   */
  async startSession(req: BrowserSessionStartRequest): Promise<BrowserSessionStartResponse> {
    const startMs = Date.now();
    const sessionId = crypto.randomUUID();
    const correlationId = req.correlationId || crypto.randomUUID();

    designSyncLogger.info({
      action: 'browser.session_start',
      sessionId,
      storyId: req.storyId,
      correlationId,
    });

    try {
      await db.insert(browserTestSessions).values({
        id: sessionId,
        storyId: req.storyId,
        startTime: new Date(),
        status: 'running',
        correlationId,
        performanceSummary: req.metadata || {},
      });

      designSyncLogger.info({
        action: 'browser.session_started',
        sessionId,
        storyId: req.storyId,
        correlationId,
        durationMs: Date.now() - startMs,
      });

      return {
        sessionId,
        storyId: req.storyId,
        status: 'running',
        correlationId,
        startTime: new Date().toISOString(),
      };
    } catch (error) {
      designSyncLogger.error({
        action: 'browser.session_start_failed',
        sessionId,
        storyId: req.storyId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startMs,
      });
      throw error;
    }
  }

  /**
   * Get browser session status and results
   */
  async getSessionStatus(sessionId: string): Promise<BrowserSessionStatusResponse | null> {
    const startMs = Date.now();

    try {
      const session = await db
        .select()
        .from(browserTestSessions)
        .where(eq(browserTestSessions.id, sessionId))
        .limit(1);

      if (session.length === 0) {
        designSyncLogger.info({
          action: 'browser.session_not_found',
          sessionId,
        });
        return null;
      }

      const sess = session[0];

      designSyncLogger.info({
        action: 'browser.session_status_retrieved',
        sessionId,
        status: sess.status,
        durationMs: Date.now() - startMs,
      });

      return {
        sessionId: sess.id,
        storyId: sess.storyId,
        status: sess.status,
        startTime: sess.startTime.toISOString(),
        endTime: sess.endTime?.toISOString() || null,
        performanceSummary: (sess.performanceSummary as Record<string, unknown>) || null,
        correlationId: sess.correlationId,
      };
    } catch (error) {
      designSyncLogger.error({
        action: 'browser.session_status_failed',
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startMs,
      });
      throw error;
    }
  }

  /**
   * Update session with test results and performance data
   */
  async updateSession(
    sessionId: string,
    status?: 'passed' | 'failed' | 'aborted',
    performanceSummary?: Record<string, unknown>
  ): Promise<void> {
    const startMs = Date.now();

    try {
      const updates: Record<string, any> = {};
      
      if (status) {
        updates.status = status;
        updates.endTime = new Date();
      }
      
      if (performanceSummary) {
        updates.performanceSummary = performanceSummary;
      }

      await db
        .update(browserTestSessions)
        .set(updates)
        .where(eq(browserTestSessions.id, sessionId));

      designSyncLogger.info({
        action: 'browser.session_updated',
        sessionId,
        resultStatus: status || 'metrics_only',
        durationMs: Date.now() - startMs,
      });
    } catch (error) {
      designSyncLogger.error({
        action: 'browser.session_update_failed',
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startMs,
      });
      throw error;
    }
  }

  /**
   * Link session to Storybook story (already done in startSession, but exposed for flexibility)
   */
  async linkToStory(sessionId: string, storyId: string): Promise<void> {
    const startMs = Date.now();

    try {
      await db
        .update(browserTestSessions)
        .set({ storyId })
        .where(eq(browserTestSessions.id, sessionId));

      designSyncLogger.info({
        action: 'browser.session_linked_to_story',
        sessionId,
        storyId,
        durationMs: Date.now() - startMs,
      });
    } catch (error) {
      designSyncLogger.error({
        action: 'browser.session_link_failed',
        sessionId,
        storyId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startMs,
      });
      throw error;
    }
  }
}

export const browserTestService = new BrowserTestService();

