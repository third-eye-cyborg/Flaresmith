import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../../db/connection';
import { projects, integrationConfigs } from '../../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * T135: PATCH /projects/:id/integrations
 * Partially update integration configurations (e.g., enable/disable Postman, add Cloudflare)
 */

const app = new Hono();

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const bodySchema = z.object({
  integrations: z.object({
    github: z.boolean().optional(),
    cloudflare: z.boolean().optional(),
    neon: z.boolean().optional(),
    postman: z.boolean().optional(),
    codespaces: z.boolean().optional(),
  }).partial(),
}).strict();

app.patch('/:id/integrations', zValidator('param', paramsSchema), zValidator('json', bodySchema), async c => {
  const { id: projectId } = c.req.valid('param');
  const { integrations: requested } = c.req.valid('json');

  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) {
      return c.json({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
          severity: 'error',
          retryPolicy: 'none',
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          context: { projectId },
        },
      }, 404);
    }

    // Current integrations map
    const current = (project.integrations || {}) as Record<string, any>;

    // Apply requested flags (simple enable/disable semantics)
    const updated = { ...current };
    for (const key of Object.keys(requested)) {
      const value = (requested as any)[key];
      if (value === true) {
        // Placeholder: Real implementation would provision missing resources
        updated[key] = { enabled: true, provisionedAt: new Date().toISOString() };
      } else if (value === false) {
        updated[key] = { enabled: false, disabledAt: new Date().toISOString() };
      }
    }

    await db.update(projects).set({ integrations: updated, updatedAt: new Date() }).where(eq(projects.id, projectId));

    return c.json({
      projectId,
      integrations: updated,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return c.json({
      error: {
        code: 'INTEGRATIONS_UPDATE_FAILED',
        message: 'Failed to update integrations',
        severity: 'error',
        retryPolicy: 'safe',
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        context: { projectId },
      },
    }, 500);
  }
});

export default app;
