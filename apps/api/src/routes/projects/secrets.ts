import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

/**
 * T143: GET /projects/:id/secrets
 * Returns masked mapping of integration-related secrets (no raw values)
 */

const app = new Hono();

const paramsSchema = z.object({
  id: z.string().uuid(),
});

app.get('/:id/secrets', zValidator('param', paramsSchema), async c => {
  const { id: projectId } = c.req.valid('param');

  // Placeholder secret inventory – in future query integrationConfigs / secure vault
  const secrets = [
    { key: 'GITHUB_TOKEN', provider: 'github', present: !!c.env.GITHUB_TOKEN },
    { key: 'CLOUDFLARE_API_TOKEN', provider: 'cloudflare', present: !!c.env.CLOUDFLARE_API_TOKEN },
    { key: 'NEON_API_KEY', provider: 'neon', present: !!c.env.NEON_API_KEY },
    { key: 'POSTMAN_API_KEY', provider: 'postman', present: !!c.env.POSTMAN_API_KEY },
  ];

  return c.json({
    projectId,
    secrets: secrets.map(s => ({
      key: s.key,
      provider: s.provider,
      status: s.present ? 'configured' : 'missing',
      value: s.present ? '********' : null,
    })),
    generatedAt: new Date().toISOString(),
  });
});

export default app;
