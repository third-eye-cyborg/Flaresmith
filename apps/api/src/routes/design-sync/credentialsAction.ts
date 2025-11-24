// T077: Credential action route (POST)
// Feature: 006-design-sync-integration
// Perform credential actions: validate, rotate, revoke
// Spec References: FR-017, US4

import type { Hono } from 'hono';
import { z } from 'zod';
import { designCredentialService } from '../../services/designCredentialService';
import { designSyncLogger } from '../../lib/designSyncLogger';

const CredentialActionSchema = z.object({
  credentialId: z.string().uuid(),
  action: z.enum(['validate', 'rotate', 'revoke']),
  metadata: z.record(z.unknown()).optional(),
});

export function registerCredentialActionRoutes(router: Hono) {
  /**
   * POST /credentials/actions
   * Perform action on credential (validate, rotate, or revoke)
   */
  router.post('/credentials/actions', async (c) => {
    const startMs = Date.now();

    try {
      // Parse request body
      const bodyResult = CredentialActionSchema.safeParse(await c.req.json());

      if (!bodyResult.success) {
        designSyncLogger.info({
          action: 'credentials.action_validation_failed',
          errors: bodyResult.error.errors,
        });
        return c.json({ error: 'invalid_payload', details: bodyResult.error.errors }, 400);
      }

      const { credentialId, action, metadata } = bodyResult.data;

      // TODO: Add RBAC check - only admins or credential owners can perform actions

      designSyncLogger.info({
        action: `credentials.action_${action}_initiated`,
        credentialId,
      });

      // Execute action via service
      const result = await designCredentialService.performAction({
        credentialId,
        action,
        ...(metadata && { metadata }),
      });

      designSyncLogger.info({
        action: `credentials.action_${action}_completed`,
        credentialId,
        providerType: result.providerType,
        resultStatus: result.status,
        durationMs: Date.now() - startMs,
      });

      return c.json(result, 200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      designSyncLogger.error({
        action: 'credentials.action_failed',
        error: errorMessage,
        durationMs: Date.now() - startMs,
      });

      // Handle specific error cases
      if (errorMessage.includes('not found')) {
        return c.json({ error: 'credential_not_found', message: errorMessage }, 404);
      }

      if (errorMessage.includes('revoked')) {
        return c.json({ error: 'credential_revoked', message: errorMessage }, 409);
      }

      return c.json({ error: 'internal_server_error', message: errorMessage }, 500);
    }
  });
}
