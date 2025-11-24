// T071: Daily digest generation job
// Feature: 006-design-sync-integration
// Aggregates last 24h notification events for users with digest enabled
// Spec References: FR-016, US3

import { db } from '../../db/connection';
import { notificationEvents, notificationPreferences } from '../../db/schema/designSync';
import { gte, eq, and } from 'drizzle-orm';
import { designSyncLogger } from '../lib/designSyncLogger';
import { notificationDispatchService } from '../services/notificationCategoryService';

/**
 * Digest payload structure (grouped event counts)
 */
export type DigestPayload = {
  userId: string;
  projectId: string | null;
  period: { start: string; end: string };
  eventCounts: {
    sync_completed: number;
    drift_detected: number;
    coverage_summary: number;
    credential_status: number;
    browser_test_failure: number;
  };
  totalEvents: number;
};

/**
 * Query events from the last 24 hours
 */
async function queryLast24hEvents() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const events = await db
    .select()
    .from(notificationEvents)
    .where(gte(notificationEvents.createdAt, yesterday));

  return { events, start: yesterday, end: now };
}

/**
 * Group events by type
 */
function aggregateEventsByType(events: Array<{ type: string; createdAt: Date }>) {
  const counts = {
    sync_completed: 0,
    drift_detected: 0,
    coverage_summary: 0,
    credential_status: 0,
    browser_test_failure: 0,
  };

  events.forEach((event) => {
    if (event.type in counts) {
      counts[event.type as keyof typeof counts]++;
    }
  });

  return counts;
}

/**
 * Fetch users with digest enabled for given frequency
 * @param frequency 'daily' or 'weekly'
 */
async function getUsersWithDigestEnabled(frequency: 'daily' | 'weekly') {
  return await db
    .select()
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.digestEnabled, true),
        eq(notificationPreferences.digestFrequency, frequency),
      ),
    );
}

/**
 * Generate digest payloads for all eligible users
 */
export async function generateDailyDigest(): Promise<DigestPayload[]> {
  const startMs = Date.now();
  designSyncLogger.info({ action: 'digest.generation_started', frequency: 'daily' });

  try {
    // Step 1: Query last 24h events
    const { events, start, end } = await queryLast24hEvents();

    if (events.length === 0) {
      designSyncLogger.info({
        action: 'digest.generation_completed',
        frequency: 'daily',
        eventCount: 0,
        digestCount: 0,
        durationMs: Date.now() - startMs,
      });
      return [];
    }

    // Step 2: Aggregate events by type
    const eventCounts = aggregateEventsByType(events);
    const totalEvents = Object.values(eventCounts).reduce((sum, count) => sum + count, 0);

    // Step 3: Fetch users with daily digest enabled
    const usersWithDigest = await getUsersWithDigestEnabled('daily');

    if (usersWithDigest.length === 0) {
      designSyncLogger.info({
        action: 'digest.generation_completed',
        frequency: 'daily',
        eventCount: totalEvents,
        digestCount: 0,
        durationMs: Date.now() - startMs,
      });
      return [];
    }

    // Step 4: Generate digest payloads
    const digests: DigestPayload[] = usersWithDigest.map((prefs: typeof notificationPreferences.$inferSelect) => ({
      userId: prefs.userId,
      projectId: prefs.projectId,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      eventCounts,
      totalEvents,
    }));

    designSyncLogger.info({
      action: 'digest.generation_completed',
      frequency: 'daily',
      eventCount: totalEvents,
      digestCount: digests.length,
      durationMs: Date.now() - startMs,
    });

    return digests;
  } catch (error) {
    designSyncLogger.error({
      action: 'digest.generation_failed',
      frequency: 'daily',
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startMs,
    });
    throw error;
  }
}

/**
 * Generate weekly digest (7 days lookback)
 */
export async function generateWeeklyDigest(): Promise<DigestPayload[]> {
  const startMs = Date.now();
  designSyncLogger.info({ action: 'digest.generation_started', frequency: 'weekly' });

  try {
    // Query last 7 days
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const events = await db
      .select()
      .from(notificationEvents)
      .where(gte(notificationEvents.createdAt, lastWeek));

    if (events.length === 0) {
      designSyncLogger.info({
        action: 'digest.generation_completed',
        frequency: 'weekly',
        eventCount: 0,
        digestCount: 0,
        durationMs: Date.now() - startMs,
      });
      return [];
    }

    const eventCounts = aggregateEventsByType(events);
    const totalEvents = Object.values(eventCounts).reduce((sum, count) => sum + count, 0);

    const usersWithDigest = await getUsersWithDigestEnabled('weekly');

    if (usersWithDigest.length === 0) {
      designSyncLogger.info({
        action: 'digest.generation_completed',
        frequency: 'weekly',
        eventCount: totalEvents,
        digestCount: 0,
        durationMs: Date.now() - startMs,
      });
      return [];
    }

    const digests: DigestPayload[] = usersWithDigest.map((prefs: typeof notificationPreferences.$inferSelect) => ({
      userId: prefs.userId,
      projectId: prefs.projectId,
      period: {
        start: lastWeek.toISOString(),
        end: now.toISOString(),
      },
      eventCounts,
      totalEvents,
    }));

    designSyncLogger.info({
      action: 'digest.generation_completed',
      frequency: 'weekly',
      eventCount: totalEvents,
      digestCount: digests.length,
      durationMs: Date.now() - startMs,
    });

    return digests;
  } catch (error) {
    designSyncLogger.error({
      action: 'digest.generation_failed',
      frequency: 'weekly',
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startMs,
    });
    throw error;
  }
}

/**
 * Job entry point (to be scheduled via cron/trigger)
 * Executes daily digest generation and dispatches to notification service
 */
export async function runDailyDigestJob() {
  designSyncLogger.info({ action: 'digest.job_started', frequency: 'daily' });

  try {
    const digests = await generateDailyDigest();

    // T073: Dispatch to Slack for each user with digest enabled
    const dispatchResults = await Promise.allSettled(
      digests.map((digest) => notificationDispatchService.dispatchDigest(digest))
    );

    const successCount = dispatchResults.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failureCount = dispatchResults.length - successCount;

    designSyncLogger.info({
      action: 'digest.job_completed',
      frequency: 'daily',
      digestCount: digests.length,
      successCount,
      failureCount,
    });

    return { success: true, digestCount: digests.length, successCount, failureCount };
  } catch (error) {
    designSyncLogger.error({
      action: 'digest.job_failed',
      frequency: 'daily',
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error };
  }
}

/**
 * Weekly digest job entry point
 */
export async function runWeeklyDigestJob() {
  designSyncLogger.info({ action: 'digest.job_started', frequency: 'weekly' });

  try {
    const digests = await generateWeeklyDigest();

    // T073: Dispatch to Slack for each user with weekly digest enabled
    const dispatchResults = await Promise.allSettled(
      digests.map((digest) => notificationDispatchService.dispatchDigest(digest))
    );

    const successCount = dispatchResults.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failureCount = dispatchResults.length - successCount;

    designSyncLogger.info({
      action: 'digest.job_completed',
      frequency: 'weekly',
      digestCount: digests.length,
      successCount,
      failureCount,
    });

    return { success: true, digestCount: digests.length, successCount, failureCount };
  } catch (error) {
    designSyncLogger.error({
      action: 'digest.job_failed',
      frequency: 'weekly',
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error };
  }
}
