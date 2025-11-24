import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { checkIdempotency, recordIdempotency } from '../../src/services/idempotency';

// Minimal project creation stub (avoids external integrations)
function createProjectStub(name: string, slug: string, orgId: string) {
  return {
    projectId: `${slug}-pid-1234`,
    name,
    slug,
    status: 'active',
    integrations: {},
    orgId,
  };
}

describe('Idempotency Convergence (T173 / FR-021)', () => {
  let app: Hono;
  const KEY = 'org-abc-githubRepo-demo-slug';
  const body = { name: 'Demo Project', slug: 'demo-slug', orgId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', idempotencyKey: KEY };

  beforeEach(() => {
    app = new Hono();
    app.post('/projects', async (c) => {
      const payload = await c.req.json();
      const key = payload.idempotencyKey || `${payload.orgId}-githubRepo-${payload.slug}`;
      const existing = await checkIdempotency(null, key);
      if (existing) {
        return c.json(existing.result, 200);
      }
      const result = createProjectStub(payload.name, payload.slug, payload.orgId);
      await recordIdempotency(null, key, 'req-1', 'user-1', result);
      return c.json(result, 201);
    });
  });

  it('returns 201 on first creation and 200 with identical result on second', async () => {
    const first = await app.request('/projects', { method: 'POST', body: JSON.stringify(body) });
    expect(first.status).toBe(201);
    const firstJson = await first.json() as any;
    expect(firstJson.projectId).toBeDefined();

    const second = await app.request('/projects', { method: 'POST', body: JSON.stringify(body) });
    expect(second.status).toBe(200);
    const secondJson = await second.json() as any;
    expect(secondJson.projectId).toBe(firstJson.projectId);
    expect(secondJson.slug).toBe(body.slug);
    expect(secondJson.status).toBe('active');
  });
});
