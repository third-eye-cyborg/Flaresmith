/**
 * T026-T027: GET /github/secrets/sync/status route
 * Query current secret sync status and quota information
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { SecretSyncStatusResponseSchema } from '@flaresmith/types';
import { getDb } from '../../../db/connection';
import { secretMappings, githubApiQuotas } from '../../../db/schema/secretSync';
import { eq } from 'drizzle-orm';

const app = new Hono();

/**
 * GET /github/secrets/sync/status?projectId=xxx
 * 
 * Query parameters:
 * - projectId: string (UUID, required)
 * 
 * Response:
 * {
 *   lastSyncAt: string (ISO 8601) | null,
 *   status: 'synced' | 'pending' | 'error' | 'never_synced',
 *   pendingCount: number,
 *   errorCount: number,
 *   nextScheduledSyncAt: string (ISO 8601) | null,
 *   quotaRemaining: {
 *     core: number,
 *     secrets: number
 *   }
 * }
 */
app.get('/', async (c) => {
  try {
    // T026: Validate query parameters
    const projectId = c.req.query('projectId');
    
    if (!projectId) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'projectId query parameter is required',
          },
        },
        400
      );
    }

    // Validate UUID format
    const uuidSchema = z.string().uuid();
    const uuidValidation = uuidSchema.safeParse(projectId);
    
    if (!uuidValidation.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'projectId must be a valid UUID',
          },
        },
        400
      );
    }

    const env = c.env as any;
    const db = getDb(env?.DATABASE_URL || '');

    // T027: Query secret_mappings table and aggregate status
    const mappings = await db
      .select({
        syncStatus: secretMappings.syncStatus,
        lastSyncedAt: secretMappings.lastSyncedAt,
      })
      .from(secretMappings)
      .where(eq(secretMappings.projectId, projectId));

    // Calculate status counts
    let pendingCount = 0;
    let errorCount = 0;
    let lastSyncAt: string | null = null;
    
    for (const mapping of mappings) {
      if (mapping.syncStatus === 'pending') pendingCount++;
      if (mapping.syncStatus === 'failed') errorCount++;
      
      if (mapping.lastSyncedAt) {
        const syncTime = new Date(mapping.lastSyncedAt).toISOString();
        if (!lastSyncAt || syncTime > lastSyncAt) {
          lastSyncAt = syncTime;
        }
      }
    }

    // Determine overall status
    let status: 'synced' | 'pending' | 'error' | 'never_synced';
    if (mappings.length === 0) {
      status = 'never_synced';
    } else if (errorCount > 0) {
      status = 'error';
    } else if (pendingCount > 0) {
      status = 'pending';
    } else {
      status = 'synced';
    }

    // T027: Fetch quota from quotaService
    const quotas = await db
      .select()
      .from(githubApiQuotas)
      .where(eq(githubApiQuotas.projectId, projectId));

    const coreQuota = quotas.find((q: any) => q.quotaType === 'core');
    const secretsQuota = quotas.find((q: any) => q.quotaType === 'secrets');

    // Calculate next scheduled sync (every 6 hours)
    // Default: 6 hours from last sync or now if never synced
    const nextScheduledSyncAt = lastSyncAt
      ? new Date(new Date(lastSyncAt).getTime() + 6 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    const response = {
      lastSyncAt,
      status,
      pendingCount,
      errorCount,
      nextScheduledSyncAt,
      quotaRemaining: {
        core: coreQuota?.remaining || 0,
        secrets: secretsQuota?.remaining || 0,
      },
    };

    // Validate response
    const responseValidation = SecretSyncStatusResponseSchema.safeParse(response);
    if (!responseValidation.success) {
      console.error('Response validation failed:', responseValidation.error);
      return c.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Response validation failed',
          },
        },
        500
      );
    }

    return c.json(responseValidation.data, 200);

  } catch (error: any) {
    console.error('Get secret sync status failed:', error);
    return c.json(
      {
        error: {
          code: 'GITHUB_SECRETS_STATUS_FAILED',
          message: 'Failed to retrieve secret sync status',
          details: error.message,
        },
      },
      500
    );
  }
});

export default app;
