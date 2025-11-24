// T074: Digest job integration tests
// Feature: 006-design-sync-integration
// Tests for daily/weekly digest generation with event aggregation and preference filtering

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../../db/connection';
import { notificationEvents, notificationPreferences } from '../../db/schema/designSync';
import { users } from '../../db/schema/base';
import { generateDailyDigest, generateWeeklyDigest, runDailyDigestJob } from '../../src/jobs/designSyncDigestJob';

describe('Digest Job - Daily Generation', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(notificationEvents);
    await db.delete(notificationPreferences);
  });

  it('should aggregate events from last 24 hours', async () => {
    // Create test events
    const now = new Date();
    const yesterday = new Date(now.getTime() - 23 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    await db.insert(notificationEvents).values([
      {
        type: 'sync_completed',
        payloadSummary: { componentCount: 5 },
        channelTargets: ['#design-sync'],
        dispatchStatus: 'sent',
        createdAt: yesterday,
      },
      {
        type: 'drift_detected',
        payloadSummary: { componentId: 'comp-1' },
        channelTargets: ['#design-sync'],
        dispatchStatus: 'sent',
        createdAt: yesterday,
      },
      {
        type: 'coverage_summary',
        payloadSummary: { coverage: 85 },
        channelTargets: ['#design-sync'],
        dispatchStatus: 'sent',
        createdAt: twoDaysAgo, // Should NOT be included
      },
    ]);

    // Create test user with daily digest enabled
    const testUser = await db
      .insert(users)
      .values({
        email: 'digest-test@example.com',
        name: 'Digest Test User',
      })
      .returning();

    await db.insert(notificationPreferences).values({
      userId: testUser[0]?.id,
      digestEnabled: true,
      digestFrequency: 'daily',
      digestTimeUtc: '09:00',
      categoryPreferences: {},
    });

    const digests = await generateDailyDigest();

    expect(digests.length).toBe(1);
    expect(digests[0]?.totalEvents).toBe(2); // Only yesterday's events
    expect(digests[0]?.eventCounts.sync_completed).toBe(1);
    expect(digests[0]?.eventCounts.drift_detected).toBe(1);
    expect(digests[0]?.eventCounts.coverage_summary).toBe(0);
  });

  it('should return empty array if no events in last 24h', async () => {
    // Create event older than 24h
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await db.insert(notificationEvents).values({
      type: 'sync_completed',
      payloadSummary: {},
      channelTargets: [],
      dispatchStatus: 'sent',
      createdAt: twoDaysAgo,
    });

    const digests = await generateDailyDigest();
    expect(digests).toEqual([]);
  });

  it('should return empty array if no users have daily digest enabled', async () => {
    // Create recent event
    await db.insert(notificationEvents).values({
      type: 'sync_completed',
      payloadSummary: {},
      channelTargets: [],
      dispatchStatus: 'sent',
    });

    const digests = await generateDailyDigest();
    expect(digests).toEqual([]);
  });

  it('should filter by digest frequency (daily only)', async () => {
    const yesterday = new Date(Date.now() - 12 * 60 * 60 * 1000);
    await db.insert(notificationEvents).values({
      type: 'sync_completed',
      payloadSummary: {},
      channelTargets: [],
      dispatchStatus: 'sent',
      createdAt: yesterday,
    });

    const testUserDaily = await db
      .insert(users)
      .values({ email: 'daily@example.com', name: 'Daily User' })
      .returning();

    const testUserWeekly = await db
      .insert(users)
      .values({ email: 'weekly@example.com', name: 'Weekly User' })
      .returning();

    await db.insert(notificationPreferences).values([
      {
        userId: testUserDaily[0]?.id,
        digestEnabled: true,
        digestFrequency: 'daily',
        digestTimeUtc: '09:00',
        categoryPreferences: {},
      },
      {
        userId: testUserWeekly[0]?.id,
        digestEnabled: true,
        digestFrequency: 'weekly',
        digestTimeUtc: '09:00',
        categoryPreferences: {},
      },
    ]);

    const digests = await generateDailyDigest();
    expect(digests.length).toBe(1); // Only daily user
    expect(digests[0]?.userId).toBe(testUserDaily[0]?.id);
  });

  it('should include all event types in aggregation', async () => {
    const yesterday = new Date(Date.now() - 12 * 60 * 60 * 1000);

    // Create one event of each type
    await db.insert(notificationEvents).values([
      { type: 'sync_completed', payloadSummary: {}, channelTargets: [], dispatchStatus: 'sent', createdAt: yesterday },
      { type: 'drift_detected', payloadSummary: {}, channelTargets: [], dispatchStatus: 'sent', createdAt: yesterday },
      { type: 'coverage_summary', payloadSummary: {}, channelTargets: [], dispatchStatus: 'sent', createdAt: yesterday },
      { type: 'credential_status', payloadSummary: {}, channelTargets: [], dispatchStatus: 'sent', createdAt: yesterday },
      { type: 'browser_test_failure', payloadSummary: {}, channelTargets: [], dispatchStatus: 'sent', createdAt: yesterday },
    ]);

    const testUser = await db
      .insert(users)
      .values({ email: 'test@example.com', name: 'Test' })
      .returning();

    await db.insert(notificationPreferences).values({
      userId: testUser[0]?.id,
      digestEnabled: true,
      digestFrequency: 'daily',
      digestTimeUtc: '09:00',
      categoryPreferences: {},
    });

    const digests = await generateDailyDigest();
    expect(digests[0]?.totalEvents).toBe(5);
    expect(digests[0]?.eventCounts.sync_completed).toBe(1);
    expect(digests[0]?.eventCounts.drift_detected).toBe(1);
    expect(digests[0]?.eventCounts.coverage_summary).toBe(1);
    expect(digests[0]?.eventCounts.credential_status).toBe(1);
    expect(digests[0]?.eventCounts.browser_test_failure).toBe(1);
  });
});

describe('Digest Job - Weekly Generation', () => {
  beforeEach(async () => {
    await db.delete(notificationEvents);
    await db.delete(notificationPreferences);
  });

  it('should aggregate events from last 7 days', async () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    await db.insert(notificationEvents).values([
      {
        type: 'sync_completed',
        payloadSummary: {},
        channelTargets: [],
        dispatchStatus: 'sent',
        createdAt: threeDaysAgo,
      },
      {
        type: 'drift_detected',
        payloadSummary: {},
        channelTargets: [],
        dispatchStatus: 'sent',
        createdAt: eightDaysAgo, // Should NOT be included
      },
    ]);

    const testUser = await db
      .insert(users)
      .values({ email: 'weekly@example.com', name: 'Weekly User' })
      .returning();

    await db.insert(notificationPreferences).values({
      userId: testUser[0]?.id,
      digestEnabled: true,
      digestFrequency: 'weekly',
      digestTimeUtc: '09:00',
      categoryPreferences: {},
    });

    const digests = await generateWeeklyDigest();

    expect(digests.length).toBe(1);
    expect(digests[0]?.totalEvents).toBe(1); // Only 3 days ago event
    expect(digests[0]?.eventCounts.sync_completed).toBe(1);
    expect(digests[0]?.eventCounts.drift_detected).toBe(0);
  });

  it('should filter by weekly frequency', async () => {
    const yesterday = new Date(Date.now() - 12 * 60 * 60 * 1000);
    await db.insert(notificationEvents).values({
      type: 'sync_completed',
      payloadSummary: {},
      channelTargets: [],
      dispatchStatus: 'sent',
      createdAt: yesterday,
    });

    const testUserWeekly = await db
      .insert(users)
      .values({ email: 'weekly@example.com', name: 'Weekly User' })
      .returning();

    const testUserDaily = await db
      .insert(users)
      .values({ email: 'daily@example.com', name: 'Daily User' })
      .returning();

    await db.insert(notificationPreferences).values([
      {
        userId: testUserWeekly[0]?.id,
        digestEnabled: true,
        digestFrequency: 'weekly',
        digestTimeUtc: '09:00',
        categoryPreferences: {},
      },
      {
        userId: testUserDaily[0]?.id,
        digestEnabled: true,
        digestFrequency: 'daily',
        digestTimeUtc: '09:00',
        categoryPreferences: {},
      },
    ]);

    const digests = await generateWeeklyDigest();
    expect(digests.length).toBe(1); // Only weekly user
    expect(digests[0]?.userId).toBe(testUserWeekly[0]?.id);
  });
});

describe('Digest Job - Job Execution', () => {
  beforeEach(async () => {
    await db.delete(notificationEvents);
    await db.delete(notificationPreferences);
  });

  it('should execute daily job and track dispatch results', async () => {
    const yesterday = new Date(Date.now() - 12 * 60 * 60 * 1000);
    await db.insert(notificationEvents).values({
      type: 'sync_completed',
      payloadSummary: {},
      channelTargets: [],
      dispatchStatus: 'sent',
      createdAt: yesterday,
    });

    const testUser = await db
      .insert(users)
      .values({ email: 'test@example.com', name: 'Test' })
      .returning();

    await db.insert(notificationPreferences).values({
      userId: testUser[0]?.id,
      digestEnabled: true,
      digestFrequency: 'daily',
      digestTimeUtc: '09:00',
      categoryPreferences: {},
    });

    // Mock Slack dispatch to avoid actual network call
    vi.mock('../../src/services/notificationCategoryService', () => ({
      notificationDispatchService: {
        dispatchDigest: vi.fn().mockResolvedValue({ success: true }),
      },
    }));

    const result = await runDailyDigestJob();

    expect(result.success).toBe(true);
    expect(result.digestCount).toBeGreaterThan(0);
  });

  it('should handle empty digest gracefully', async () => {
    const result = await runDailyDigestJob();
    expect(result.success).toBe(true);
    expect(result.digestCount).toBe(0);
  });
});
