import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hono } from '../../../src/app';
import { db } from '../../../src/db/client';
import { users, userSessions, adminSessions } from '../../../src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Token Misuse Tests
 * 
 * Validates SC-019 (admin cannot access billing) and SC-020 (user cannot access admin audit logs)
 * by attempting cross-boundary token usage.
 */

describe('Admin Token Boundary Enforcement', () => {
  let adminToken: string;
  let userToken: string;
  let adminUserId: string;
  let regularUserId: string;

  beforeAll(async () => {
    // Create test admin user
    const [admin] = await db
      .insert(users)
      .values({
        email: 'test-admin@cloudmake.dev',
        authRole: 'admin',
        neonAuthId: 'neon-test-admin',
      })
      .returning();

    adminUserId = admin.id;

    // Create test regular user
    const [user] = await db
      .insert(users)
      .values({
        email: 'test-user@cloudmake.dev',
        authRole: 'user',
        betterAuthId: 'better-test-user',
      })
      .returning();

    regularUserId = user.id;

    // Create admin session
    const [adminSession] = await db
      .insert(adminSessions)
      .values({
        userId: adminUserId,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      })
      .returning();

    adminToken = `admin-token-${adminSession.id}`;

    // Create user session
    const [userSession] = await db
      .insert(userSessions)
      .values({
        userId: regularUserId,
        expiresAt: new Date(Date.now() + 3600000),
      })
      .returning();

    userToken = `user-token-${userSession.id}`;
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(adminSessions).where(eq(adminSessions.userId, adminUserId));
    await db.delete(userSessions).where(eq(userSessions.userId, regularUserId));
    await db.delete(users).where(eq(users.id, adminUserId));
    await db.delete(users).where(eq(users.id, regularUserId));
  });

  it('should reject user token on admin endpoint (SC-020)', async () => {
    const res = await hono.request('/admin/users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('AUTH_ADMIN_BOUNDARY_VIOLATION');
    expect(body.error.message).toContain('Admin token required');
  });

  it('should reject admin token on billing endpoint (SC-019)', async () => {
    const res = await hono.request('/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        productId: 'prod_test',
        successUrl: 'https://example.com/success',
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('AUTH_USER_BOUNDARY_VIOLATION');
    expect(body.error.message).toContain('User token required');
  });

  it('should allow admin token on admin endpoint', async () => {
    const res = await hono.request('/admin/users?limit=10', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toBeDefined();
    expect(Array.isArray(body.users)).toBe(true);
  });

  it('should allow user token on billing endpoint', async () => {
    const res = await hono.request('/billing/subscription/status', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });

    // May return 404 if no subscription, but should not be 403
    expect(res.status).not.toBe(403);
  });

  it('should reject expired admin token', async () => {
    const [expiredSession] = await db
      .insert(adminSessions)
      .values({
        userId: adminUserId,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      })
      .returning();

    const expiredToken = `admin-token-${expiredSession.id}`;

    const res = await hono.request('/admin/users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${expiredToken}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTH_SESSION_EXPIRED');

    // Cleanup
    await db.delete(adminSessions).where(eq(adminSessions.id, expiredSession.id));
  });

  it('should reject token with no active session', async () => {
    const fakeToken = 'admin-token-00000000-0000-0000-0000-000000000000';

    const res = await hono.request('/admin/users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${fakeToken}` },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTH_SESSION_NOT_FOUND');
  });
});
