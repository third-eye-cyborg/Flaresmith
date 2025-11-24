/**
 * POST /design/rollback
 * Feature: 004-design-system
 * Tasks: T077, T078
 *
 * Rollback tokens to a previous snapshot version creating a new immutable version.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { RollbackRequest, RollbackResponse } from '@flaresmith/types';
import { rollbackService } from '../../services/designSystem/rollbackService';

const app = new Hono();

app.post('/', zValidator('json', RollbackRequest), async (c) => {
  const { targetVersion, rationale } = c.req.valid('json');

  // Derive actor and role from context (simplified; integrate real auth later)
  const user = c.get('user');
  const actorId = user?.id || 'system';
  const actorRole = (user?.role || 'viewer') as any; // cast for now
  const environment = (c.req.header('x-design-environment') || 'dev').toLowerCase();

  try {
    const result = await rollbackService.rollbackToVersion({
      targetVersion,
      actorId,
      actorRole,
      environment,
      rationale,
      correlationId: c.get('correlationId') || crypto.randomUUID(),
    });

    return c.json(
      RollbackResponse.parse({
        previousVersion: result.previousVersion,
        newVersion: result.newVersion,
        hash: result.hash,
        durationMs: result.durationMs,
      })
    );
  } catch (error) {
    return c.json(
      {
        error: {
          message: (error as Error).message,
        },
      },
      400
    );
  }
});

export default app;
