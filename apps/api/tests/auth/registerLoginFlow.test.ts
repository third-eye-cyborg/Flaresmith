import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import registerRoute from '../../src/routes/auth/register';
import loginRoute from '../../src/routes/auth/login';
import refreshRoute from '../../src/routes/auth/refresh';
import signoutRoute from '../../src/routes/auth/signout';
import signoutAllRoute from '../../src/routes/auth/signoutAll';
import { verifyToken } from '../../src/lib/jwt';

// Minimal environment bindings for tests
const ENV = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
  JWT_SIGNING_KEY: 'test-signing-key'
} as any;

function buildApp() {
  const app = new Hono<{ Bindings: typeof ENV }>();
  app.route('/auth/register', registerRoute);
  app.route('/auth/login', loginRoute);
  app.route('/auth/refresh', refreshRoute);
  app.route('/auth/logout', signoutRoute);
  app.route('/auth/logout-all', signoutAllRoute);
  return app;
}

describe('Auth register/login/refresh/signout flow', () => {
  const email = `tester+${Date.now()}@example.com`;
  const password = 'Str0ng!Pass123';
  const app = buildApp();
  let accessToken: string; let refreshToken: string;

  it('registers a new user', async () => {
    const req = new Request('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const res = await app.fetch(req, ENV);
    expect(res.status).toBe(201);
    const json: any = await res.json();
    expect(json.accessToken).toBeDefined();
    expect(json.refreshToken).toBeDefined();
    accessToken = json.accessToken;
    refreshToken = json.refreshToken;
    const payload = await verifyToken(accessToken);
    expect(payload.userId).toBeDefined();
    expect(payload.sessionId).toBeDefined();
  });

  it('fails duplicate registration', async () => {
    const req = new Request('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const res = await app.fetch(req, ENV);
    expect(res.status).toBe(409);
  });

  it('logs in existing user', async () => {
    const req = new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const res = await app.fetch(req, ENV);
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.accessToken).toBeDefined();
    expect(json.refreshToken).toBeDefined();
    accessToken = json.accessToken;
    refreshToken = json.refreshToken;
  });

  it('rejects invalid password', async () => {
    const req = new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'WrongPass123!' })
    });
    const res = await app.fetch(req, ENV);
    expect(res.status).toBe(401);
  });

  it('refreshes session', async () => {
    const req = new Request('http://localhost/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const res = await app.fetch(req, ENV);
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.accessToken).toBeDefined();
    expect(json.refreshToken).toBeDefined();
    expect(json.accessToken).not.toEqual(accessToken);
    accessToken = json.accessToken;
    refreshToken = json.refreshToken;
  });

  it('rejects reused refresh token', async () => {
    // Use old refresh token again (should be rotated)
    const req = new Request('http://localhost/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const res = await app.fetch(req, ENV);
    expect([401,409]).toContain(res.status);
  });

  it('signout single session', async () => {
    const req = new Request('http://localhost/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const res = await app.fetch(req, ENV);
    expect(res.status).toBe(204);
  });

  it('signout all sessions', async () => {
    // Need login again to have active session
    const loginReq = new Request('http://localhost/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
    });
    const loginRes = await app.fetch(loginReq, ENV);
    const loginJson: any = await loginRes.json();
    const at = loginJson.accessToken;
    const req = new Request('http://localhost/auth/logout-all', { method: 'POST', headers: { 'Authorization': `Bearer ${at}` }});
    const res = await app.fetch(req, ENV);
    expect(res.status).toBe(204);
  });
});
