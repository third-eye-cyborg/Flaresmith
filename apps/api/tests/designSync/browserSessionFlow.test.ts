// T086: Browser session flow integration tests
// Feature: 006-design-sync-integration
// Test browser test session lifecycle: start → status poll → completion
// Spec References: FR-018, US5

import { describe, it, expect, afterEach } from 'vitest';
import { browserTestService } from '../../src/services/browserTestService';

describe('Browser Session Flow Integration', () => {
  let sessionId: string;

  afterEach(async () => {
    // Cleanup: Set session to aborted if it exists
    if (sessionId) {
      try {
        await browserTestService.updateSession(sessionId, 'aborted', undefined);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('Standard Session Lifecycle', () => {
    it('should start session with generated correlationId', async () => {
      const response = await browserTestService.startSession({
        storyId: '123e4567-e89b-12d3-a456-426614174000',
      });

      sessionId = response.sessionId;

      expect(response.sessionId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(response.correlationId).toMatch(/^[0-9a-f-]{36}$/);
      expect(response.status).toBe('running');
      expect(response.startTime).toBeTruthy();
    });

    it('should start session with provided correlationId', async () => {
      const correlationId = '123e4567-e89b-12d3-a456-426614174001';
      const response = await browserTestService.startSession({
        storyId: '123e4567-e89b-12d3-a456-426614174002',
        correlationId,
      });

      sessionId = response.sessionId;

      expect(response.correlationId).toBe(correlationId);
    });

    it('should retrieve session status', async () => {
      const started = await browserTestService.startSession({
        storyId: '123e4567-e89b-12d3-a456-426614174003',
      });

      sessionId = started.sessionId;

      const status = await browserTestService.getSessionStatus(sessionId);

      expect(status).toBeTruthy();
      expect(status?.sessionId).toBe(sessionId);
      expect(status?.status).toBe('running');
      expect(status?.storyId).toBe('123e4567-e89b-12d3-a456-426614174003');
    });

    it('should return null for non-existent session', async () => {
      const status = await browserTestService.getSessionStatus('123e4567-e89b-12d3-a456-426614174999');

      expect(status).toBeNull();
    });

    it('should complete session with passed status', async () => {
      const started = await browserTestService.startSession({
        storyId: '123e4567-e89b-12d3-a456-426614174004',
      });

      sessionId = started.sessionId;

      await browserTestService.updateSession(sessionId, 'passed', {
        lcp: 1200,
        fid: 50,
        cls: 0.05,
      });

      const updated = await browserTestService.getSessionStatus(sessionId);

      expect(updated?.status).toBe('passed');
      expect(updated?.endTime).toBeTruthy();
      expect(updated?.performanceSummary).toMatchObject({
        lcp: 1200,
        fid: 50,
        cls: 0.05,
      });
    });

    it('should complete session with failed status', async () => {
      const started = await browserTestService.startSession({
        storyId: '123e4567-e89b-12d3-a456-426614174005',
      });

      sessionId = started.sessionId;

      await browserTestService.updateSession(sessionId, 'failed', undefined);

      const updated = await browserTestService.getSessionStatus(sessionId);

      expect(updated?.status).toBe('failed');
      expect(updated?.endTime).toBeTruthy();
    });

    it('should abort session', async () => {
      const started = await browserTestService.startSession({
        storyId: '123e4567-e89b-12d3-a456-426614174006',
      });

      sessionId = started.sessionId;

      await browserTestService.updateSession(sessionId, 'aborted', undefined);

      const updated = await browserTestService.getSessionStatus(sessionId);

      expect(updated?.status).toBe('aborted');
      expect(updated?.endTime).toBeTruthy();
    });
  });

  describe('Performance Metrics', () => {
    it('should store Core Web Vitals', async () => {
      const started = await browserTestService.startSession({
        storyId: '123e4567-e89b-12d3-a456-426614174007',
      });

      sessionId = started.sessionId;

      await browserTestService.updateSession(sessionId, 'passed', {
        lcp: 2400,
        fid: 80,
        cls: 0.08,
        ttfb: 500,
      });

      const updated = await browserTestService.getSessionStatus(sessionId);

      expect(updated?.performanceSummary).toMatchObject({
        lcp: 2400,
        fid: 80,
        cls: 0.08,
        ttfb: 500,
      });
    });

    it('should store custom metrics', async () => {
      const started = await browserTestService.startSession({
        storyId: '123e4567-e89b-12d3-a456-426614174008',
      });

      sessionId = started.sessionId;

      await browserTestService.updateSession(sessionId, 'passed', {
        authFlowDuration: 3200,
        networkWaterfallDuration: 5000,
        screenshotDiffScore: 0.02,
      });

      const updated = await browserTestService.getSessionStatus(sessionId);

      expect(updated?.performanceSummary).toMatchObject({
        authFlowDuration: 3200,
        networkWaterfallDuration: 5000,
        screenshotDiffScore: 0.02,
      });
    });

    it('should merge performance metrics on update', async () => {
      const started = await browserTestService.startSession({
        storyId: '123e4567-e89b-12d3-a456-426614174009',
      });

      sessionId = started.sessionId;

      await browserTestService.updateSession(sessionId, undefined, { lcp: 1500 });
      await browserTestService.updateSession(sessionId, undefined, { fid: 60 });

      const updated = await browserTestService.getSessionStatus(sessionId);

      expect(updated?.performanceSummary).toMatchObject({
        lcp: 1500,
        fid: 60,
      });
    });
  });

  describe('Story Linking', () => {
    it('should link session to story', async () => {
      const started = await browserTestService.startSession({
        storyId: '123e4567-e89b-12d3-a456-426614174010',
      });

      sessionId = started.sessionId;

      const newStoryId = '123e4567-e89b-12d3-a456-426614174011';
      await browserTestService.linkToStory(sessionId, newStoryId);

      const updated = await browserTestService.getSessionStatus(sessionId);

      expect(updated?.storyId).toBe(newStoryId);
    });
  });

  describe('Concurrent Sessions', () => {
    it('should handle multiple concurrent sessions', async () => {
      const session1 = await browserTestService.startSession({
        storyId: '123e4567-e89b-12d3-a456-426614174012',
      });

      const session2 = await browserTestService.startSession({
        storyId: '123e4567-e89b-12d3-a456-426614174013',
      });

      expect(session1.sessionId).not.toBe(session2.sessionId);
      expect(session1.correlationId).not.toBe(session2.correlationId);

      // Cleanup both
      await browserTestService.updateSession(session1.sessionId, 'aborted', undefined);
      await browserTestService.updateSession(session2.sessionId, 'aborted', undefined);
    });
  });
});
