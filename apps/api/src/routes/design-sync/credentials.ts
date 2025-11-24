// T076: Credential status route (GET)
// Feature: 006-design-sync-integration
// Query credential status for all integration providers
// Spec References: FR-017, US4

import type { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../../../db/connection';
import { credentialRecords } from '../../../db/schema/designSync';
import { eq, inArray } from 'drizzle-orm';
import { designSyncLogger } from '../../lib/designSyncLogger';

const CredentialQuerySchema = z.object({
  providers: z.string().optional(), // Comma-separated provider types
});

export function registerCredentialRoutes(router: Hono) {
  /**
   * GET /credentials
   * Retrieve credential status for all or specified providers
   * Returns: Array of credential records with status, validation times, rotation due dates
   */
  router.get('/credentials', async (c) => {
    const startMs = Date.now();

    try {
      // Parse query parameters
      const query = CredentialQuerySchema.safeParse({
        providers: c.req.query('providers'),
      });

      if (!query.success) {
        designSyncLogger.info({
          action: 'credentials.query_validation_failed',
          errors: query.error.errors,
        });
        return c.json({ error: 'invalid_query', details: query.error.errors }, 400);
      }

      const { providers: providersParam } = query.data;

      // Determine target providers
      let credentials;
      if (providersParam) {
        const providerTypes = providersParam.split(',').filter(Boolean) as Array<'notification' | 'design' | 'documentation' | 'testing' | 'ai' | 'analytics'>;
        credentials = await db
          .select()
          .from(credentialRecords)
          .where(inArray(credentialRecords.providerType, providerTypes));
      } else {
        credentials = await db.select().from(credentialRecords);
      }

      // Transform to response format
      const response = credentials.map((cred: typeof credentialRecords.$inferSelect) => ({
        id: cred.id,
        providerType: cred.providerType,
        status: cred.status,
        lastValidationTime: cred.lastValidationTime?.toISOString() || null,
        rotationDue: cred.rotationDue?.toISOString() || null,
        metadata: cred.metadata,
        createdAt: cred.createdAt.toISOString(),
        updatedAt: cred.updatedAt.toISOString(),
      }));

      designSyncLogger.info({
        action: 'credentials.query_completed',
        credentialCount: response.length,
        durationMs: Date.now() - startMs,
      });

      return c.json({
        credentials: response,
        total: response.length,
        durationMs: Date.now() - startMs,
      });
    } catch (error) {
      designSyncLogger.error({
        action: 'credentials.query_failed',
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startMs,
      });
      return c.json({ error: 'internal_server_error' }, 500);
    }
  });

  /**
   * GET /credentials/:id
   * Retrieve single credential by ID
   */
  router.get('/credentials/:id', async (c) => {
    const credentialId = c.req.param('id');
    const startMs = Date.now();

    try {
      const credential = await db
        .select()
        .from(credentialRecords)
        .where(eq(credentialRecords.id, credentialId))
        .limit(1);

      if (credential.length === 0) {
        designSyncLogger.info({
          action: 'credentials.not_found',
          credentialId,
        });
        return c.json({ error: 'credential_not_found' }, 404);
      }

      const cred = credential[0];
      designSyncLogger.info({
        action: 'credentials.get_completed',
        credentialId,
        providerType: cred.providerType,
        status: cred.status,
        durationMs: Date.now() - startMs,
      });

      return c.json({
        id: cred.id,
        providerType: cred.providerType,
        status: cred.status,
        lastValidationTime: cred.lastValidationTime?.toISOString() || null,
        rotationDue: cred.rotationDue?.toISOString() || null,
        metadata: cred.metadata,
        createdAt: cred.createdAt.toISOString(),
        updatedAt: cred.updatedAt.toISOString(),
      });
    } catch (error) {
      designSyncLogger.error({
        action: 'credentials.get_failed',
        credentialId,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startMs,
      });
      return c.json({ error: 'internal_server_error' }, 500);
    }
  });
}
