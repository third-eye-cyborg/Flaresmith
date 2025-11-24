import { describe, it, expect } from 'vitest';
import { authMiddleware } from '../../src/middleware/auth';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';

// Minimal Env bindings stub
const ENV = {
  JWT_SIGNING_KEY: 'test-secret-key',
} as any;

describe('authMiddleware', () => {
  it('allows request with valid JWT', async () => {
    const app = new Hono<{ Bindings: typeof ENV }>();
    app.use('*', authMiddleware());
    app.get('/', c => c.text('ok'));

    const token = await sign({ sub: 'user-123', orgId: 'org-456' }, ENV.JWT_SIGNING_KEY);

    const req = new Request('http://localhost/');
    req.headers.set('Authorization', `Bearer ${token}`);
    const res = await app.fetch(req, ENV);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('rejects request with missing auth header', async () => {
    const app = new Hono<{ Bindings: typeof ENV }>();
    app.use('*', authMiddleware());
    app.get('/', c => c.text('ok'));

    const req = new Request('http://localhost/');
    const res = await app.fetch(req, ENV);
    expect(res.status).toBe(401);
  });

  it('rejects request with invalid token', async () => {
    const app = new Hono<{ Bindings: typeof ENV }>();
    app.use('*', authMiddleware());
    app.get('/', c => c.text('ok'));

    const req = new Request('http://localhost/');
    req.headers.set('Authorization', 'Bearer invalid.token.value');
    const res = await app.fetch(req, ENV);
    expect(res.status).toBe(401);
  });
});
