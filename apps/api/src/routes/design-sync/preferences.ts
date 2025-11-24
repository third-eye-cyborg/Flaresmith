// T070: Notification preference routes (GET/PUT)
// Feature: 006-design-sync-integration
// Per-user notification category toggles and digest settings
// Spec References: FR-016, US3

import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../../db/connection';
import { notificationPreferences } from '../../../db/schema/designSync';
import { eq, and } from 'drizzle-orm';
import { designSyncLogger } from '../../lib/designSyncLogger';

// Category enum matching notification_event_type
const NotificationCategory = z.enum([
  'sync_completed',
  'drift_detected',
  'coverage_summary',
  'digest',
  'credential_status',
  'browser_test_failure',
]);

const DigestFrequency = z.enum(['daily', 'weekly', 'never']);

// Preferences payload schema
const PreferenceUpdateSchema = z.object({
  categoryPreferences: z.record(NotificationCategory, z.boolean()).optional(),
  digestEnabled: z.boolean().optional(),
  digestFrequency: DigestFrequency.optional(),
  digestTimeUtc: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(), // HH:MM format
  projectId: z.string().uuid().optional().nullable(),
});

// Default preferences factory
const DEFAULT_CATEGORY_PREFERENCES = {
  sync_completed: true,
  drift_detected: true,
  coverage_summary: true,
  digest: true,
  credential_status: true,
  browser_test_failure: true,
};

const DEFAULT_DIGEST_ENABLED = false;
const DEFAULT_DIGEST_FREQUENCY = 'daily';
const DEFAULT_DIGEST_TIME_UTC = '09:00';

export function registerPreferencesRoutes(router: Hono) {
  /**
   * GET /preferences/:userId
   * Retrieve notification preferences for a user (optionally scoped to projectId)
   * Returns defaults if no preferences exist
   */
  router.get('/preferences/:userId', async (c) => {
    const userId = c.req.param('userId');
    const projectId = c.req.query('projectId') || null;

    try {
      // TODO: RBAC enforcement - ensure caller is user or has admin role
      // For now, assume authorization middleware handles this upstream

      // Query preferences with optional project scoping
      const conditions = [eq(notificationPreferences.userId, userId)];
      if (projectId) {
        conditions.push(eq(notificationPreferences.projectId, projectId));
      }

      const existingPrefs = await db
        .select()
        .from(notificationPreferences)
        .where(and(...conditions))
        .limit(1);

      if (existingPrefs.length === 0) {
        // Return defaults if no preferences exist
        designSyncLogger.info({
          action: 'preferences.get_defaults',
          userId,
          projectId,
        });
        return c.json({
          userId,
          projectId,
          categoryPreferences: DEFAULT_CATEGORY_PREFERENCES,
          digestEnabled: DEFAULT_DIGEST_ENABLED,
          digestFrequency: DEFAULT_DIGEST_FREQUENCY,
          digestTimeUtc: DEFAULT_DIGEST_TIME_UTC,
        });
      }

      const pref = existingPrefs[0];
      designSyncLogger.info({
        action: 'preferences.get_existing',
        userId,
        projectId,
        prefsId: pref.id,
      });

      return c.json({
        userId: pref.userId,
        projectId: pref.projectId,
        categoryPreferences: pref.categoryPreferences as Record<string, boolean>,
        digestEnabled: pref.digestEnabled,
        digestFrequency: pref.digestFrequency,
        digestTimeUtc: pref.digestTimeUtc,
      });
    } catch (error) {
      designSyncLogger.error({
        action: 'preferences.get_failed',
        userId,
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      return c.json({ error: 'internal_server_error' }, 500);
    }
  });

  /**
   * PUT /preferences/:userId
   * Update notification preferences (creates if not exists)
   * Supports partial updates
   */
  router.put('/preferences/:userId', async (c) => {
    const userId = c.req.param('userId');
    const projectId = c.req.query('projectId') || null;

    try {
      // Parse request body
      const bodyResult = PreferenceUpdateSchema.safeParse(await c.req.json());
      if (!bodyResult.success) {
        designSyncLogger.info({
          action: 'preferences.update_validation_failed',
          userId,
          errors: bodyResult.error.errors,
        });
        return c.json({ error: 'invalid_payload', details: bodyResult.error.errors }, 400);
      }

      const updates = bodyResult.data;

      // TODO: RBAC enforcement - ensure caller is userId or admin

      // Check if preferences exist
      const conditions = [eq(notificationPreferences.userId, userId)];
      if (projectId) {
        conditions.push(eq(notificationPreferences.projectId, projectId));
      }

      const existingPrefs = await db
        .select()
        .from(notificationPreferences)
        .where(and(...conditions))
        .limit(1);

      if (existingPrefs.length === 0) {
        // Create new preferences
        const newPrefs = await db
          .insert(notificationPreferences)
          .values({
            userId,
            projectId,
            categoryPreferences: updates.categoryPreferences || DEFAULT_CATEGORY_PREFERENCES,
            digestEnabled: updates.digestEnabled ?? DEFAULT_DIGEST_ENABLED,
            digestFrequency: updates.digestFrequency || DEFAULT_DIGEST_FREQUENCY,
            digestTimeUtc: updates.digestTimeUtc || DEFAULT_DIGEST_TIME_UTC,
          })
          .returning();

        designSyncLogger.info({
          action: 'preferences.created',
          userId,
          projectId,
          prefsId: newPrefs[0]?.id,
        });

        return c.json(
          {
            userId: newPrefs[0]?.userId,
            projectId: newPrefs[0]?.projectId,
            categoryPreferences: newPrefs[0]?.categoryPreferences,
            digestEnabled: newPrefs[0]?.digestEnabled,
            digestFrequency: newPrefs[0]?.digestFrequency,
            digestTimeUtc: newPrefs[0]?.digestTimeUtc,
          },
          201,
        );
      }

      // Update existing preferences (partial)
      const existingPref = existingPrefs[0];
      const updatedPrefs = await db
        .update(notificationPreferences)
        .set({
          categoryPreferences: updates.categoryPreferences
            ? { ...(existingPref.categoryPreferences as object), ...updates.categoryPreferences }
            : existingPref.categoryPreferences,
          digestEnabled: updates.digestEnabled ?? existingPref.digestEnabled,
          digestFrequency: updates.digestFrequency || existingPref.digestFrequency,
          digestTimeUtc: updates.digestTimeUtc || existingPref.digestTimeUtc,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.id, existingPref.id))
        .returning();

      designSyncLogger.info({
        action: 'preferences.updated',
        userId,
        projectId,
        prefsId: existingPref.id,
        changedFields: Object.keys(updates),
      });

      return c.json({
        userId: updatedPrefs[0]?.userId,
        projectId: updatedPrefs[0]?.projectId,
        categoryPreferences: updatedPrefs[0]?.categoryPreferences,
        digestEnabled: updatedPrefs[0]?.digestEnabled,
        digestFrequency: updatedPrefs[0]?.digestFrequency,
        digestTimeUtc: updatedPrefs[0]?.digestTimeUtc,
      });
    } catch (error) {
      designSyncLogger.error({
        action: 'preferences.update_failed',
        userId,
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });
      return c.json({ error: 'internal_server_error' }, 500);
    }
  });
}
