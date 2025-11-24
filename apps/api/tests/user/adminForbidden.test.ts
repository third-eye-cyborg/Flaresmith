import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hono } from '../../../src/app';
import { db } from '../../../src/db/client';
import { users, userSessions, adminSessions } from '../../../src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Admin Access Forbidden Test
 * 
 * Validates SC-020: User tokens cannot access admin endpoints
 * 
 * Tests:
 * - User token on /admin/* routes → 403
 * - User token on /billing/* routes → 200 (allowed)
 * - Admin token on /admin/* routes → 200 (allowed)
 * 
 * NOTE: Requires TEST_DATABASE_URL environment variable with a real Neon database connection.
 * Tests are currently skipped until test database infrastructure is set up.
 */

describe.skip('User Token Admin Access Rejection (requires test DB)', () => {
  let userToken: string;
  let adminToken: string;
  let userId: string;
  let adminId: string;

  beforeAll(async () => {
    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: 'user@test.com',
        authRole: 'user',
        betterAuthId: 'better-test-user',
      })
      .returning();

    userId = user.id;

    // Create user session
    const [userSession] = await db
      .insert(userSessions)
      .values({
        userId,
        expiresAt: new Date(Date.now() + 3600000),
      })
      .returning();

    userToken = `user-token-${userSession.id}`;

    // Create test admin
    const [admin] = await db
      .insert(users)
      .values({
        email: 'admin@test.com',
        authRole: 'admin',
        neonAuthId: 'neon-test-admin',
      })
      .returning();

    adminId = admin.id;

    // Create admin session
    const [adminSession] = await db
      .insert(adminSessions)
      .values({
        userId: adminId,
        expiresAt: new Date(Date.now() + 3600000),
      })
      .returning();

    adminToken = `admin-token-${adminSession.id}`;
  });

  afterAll(async () => {
    await db.delete(userSessions).where(eq(userSessions.userId, userId));
    await db.delete(adminSessions).where(eq(adminSessions.userId, adminId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, adminId));
  });

  it('should reject user token on admin users endpoint', async () => {
    const res = await hono.request('/admin/users?limit=10', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('AUTH_ADMIN_BOUNDARY_VIOLATION');
    expect(body.error.message).toContain('Admin token required');
  });

  it('should reject user token on admin audit logs endpoint', async () => {
    const res = await hono.request('/admin/audit/actions?limit=10', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('AUTH_ADMIN_BOUNDARY_VIOLATION');
  });

  it('should allow user token on billing checkout endpoint', async () => {
    const res = await hono.request('/billing/web/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        productId: 'prod_test',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }),
    });

    // Should not be 403 (may be 400 for invalid product, but not forbidden)
    expect(res.status).not.toBe(403);
  });

  it('should allow admin token on admin users endpoint', async () => {
    const res = await hono.request('/admin/users?limit=10', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toBeDefined();
    expect(Array.isArray(body.users)).toBe(true);
  });

  it('should reject user token with clear error message', async () => {
    const res = await hono.request('/admin/users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });

    const body = await res.json();
    expect(body.error.hint).toBeDefined();
    expect(body.error.hint).toContain('/admin/auth/login');
    expect(body.error.context.tokenType).toBe('user');
    expect(body.error.context.expectedType).toBe('admin');
  });
});
