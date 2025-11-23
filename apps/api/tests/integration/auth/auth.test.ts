import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import registerRoute from '../../../src/routes/auth/register';
import loginRoute from '../../../src/routes/auth/login';
import refreshRoute from '../../../src/routes/auth/refresh';
import signoutRoute from '../../../src/routes/auth/signout';
import signoutAllRoute from '../../../src/routes/auth/signoutAll';
import { verifyToken } from '../../../src/lib/jwt';

const ENV = { DATABASE_URL: 'postgres://user:pass@localhost:5432/db', JWT_SIGNING_KEY: 'test-signing-key' } as any;

function buildApp() {
  const app = new Hono<{ Bindings: typeof ENV }>();
  app.route('/auth/register', registerRoute);
  app.route('/auth/login', loginRoute);
  app.route('/auth/refresh', refreshRoute);
  app.route('/auth/logout', signoutRoute);
  app.route('/auth/logout-all', signoutAllRoute);
  return app;
}

describe('Auth integration', () => {
  const email = `inttest+${Date.now()}@example.com`;
  const password = 'Str0ng!Pass123';
  const app = buildApp();
  let accessToken: string; let refreshToken: string;

  it('registers user and returns tokens', async () => {
    const res = await app.fetch(new Request('http://localhost/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}), ENV);
    expect(res.status).toBe(201);
    const json: any = await res.json();
    expect(json.accessToken).toBeDefined();
    expect(json.refreshToken).toBeDefined();
    accessToken = json.accessToken; refreshToken = json.refreshToken;
    const payload = await verifyToken(accessToken); expect(payload.userId).toBeDefined();
  });

  it('login succeeds', async () => {
    const res = await app.fetch(new Request('http://localhost/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}), ENV);
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.accessToken).toBeDefined();
    expect(json.refreshToken).toBeDefined();
    accessToken = json.accessToken; refreshToken = json.refreshToken;
  });

  it('refresh rotates refresh token', async () => {
    const res = await app.fetch(new Request('http://localhost/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken})}), ENV);
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.refreshToken).toBeDefined();
    expect(json.refreshToken).not.toEqual(refreshToken);
    refreshToken = json.refreshToken; accessToken = json.accessToken;
  });

  it('reused refresh token rejected', async () => {
    const res = await app.fetch(new Request('http://localhost/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken})}), ENV);
    expect([401,409]).toContain(res.status);
  });

  it('signout current session', async () => {
    const res = await app.fetch(new Request('http://localhost/auth/logout',{method:'POST',headers:{Authorization:`Bearer ${accessToken}`}}), ENV);
    expect(res.status).toBe(204);
  });

  it('signout all sessions', async () => {
    // login again first
    const loginRes = await app.fetch(new Request('http://localhost/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}), ENV);
    const loginJson: any = await loginRes.json();
    const at = loginJson.accessToken;
    const res = await app.fetch(new Request('http://localhost/auth/logout-all',{method:'POST',headers:{Authorization:`Bearer ${at}`}}), ENV);
    expect(res.status).toBe(204);
  });
});
