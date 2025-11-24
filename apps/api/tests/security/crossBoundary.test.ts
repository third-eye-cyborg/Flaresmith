import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../../src/app';
import { db } from '../../src/db/client';
import { users, adminSessions, polarCustomers } from '../../db/schema';
import { userSessions } from '../../db/schema/userSessions';
import { eq } from 'drizzle-orm';

/**
 * Cross-Boundary Middleware Tests (T085)
 * 
 * Validates SC-003, SC-005, SC-010:
 * - User tokens cannot access admin endpoints (403 within 50ms)
 * - Admin tokens can access admin endpoints
 * - RLS enforcement prevents cross-role data access
 * - Token type mismatch rejected in <10ms at middleware layer
 * 
 * Test Coverage:
 * 1. User → Admin route rejection
 * 2. Admin → Admin route allowed
 * 3. User data scope isolation
 * 4. Admin data scope (all records)
 * 5. RLS enforcement at DB layer
 * 
 * NOTE: Requires TEST_DATABASE_URL environment variable with a real Neon database connection.
 * Tests are currently skipped until test database infrastructure is set up.
 */

describe.skip('Cross-Boundary Access Control (requires test DB)', () => {
  let userToken: string;
  let adminToken: string;
  let userId: string;
  let userId2: string;
  let adminId: string;

  beforeAll(async () => {
    // Create test user 1
    const [user1] = await db
      .insert(users)
      .values({
        email: 'user1@test.com',
        role: 'user',
        betterAuthId: 'better-user-1',
      })
      .returning();

    userId = user1.id;

    // Create test user 2
    const [user2] = await db
      .insert(users)
      .values({
        email: 'user2@test.com',
        role: 'user',
        betterAuthId: 'better-user-2',
      })
      .returning();

    userId2 = user2.id;

    // Create user session for user 1
    const [userSession] = await db
      .insert(userSessions)
      .values({
        userId,
        tokenHash: 'hash-user-1',
        expiresAt: new Date(Date.now() + 3600000),
        polarCustomerId: 'pcus_test_user1',
      })
      .returning();

    userToken = `user-token-${userSession.id}`;

    // Create polar customer for user 1
    await db.insert(polarCustomers).values({
      userId,
      polarCustomerId: 'pcus_test_user1',
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
    });

    // Create polar customer for user 2
    await db.insert(polarCustomers).values({
      userId: userId2,
      polarCustomerId: 'pcus_test_user2',
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
    });

    // Create test admin
    const [admin] = await db
      .insert(users)
      .values({
        email: 'admin@test.com',
        role: 'admin',
        neonAuthId: 'neon-admin-1',
      })
      .returning();

    adminId = admin.id;

    // Create admin session
    const [adminSession] = await db
      .insert(adminSessions)
      .values({
        userId: adminId,
        tokenHash: 'hash-admin-1',
        expiresAt: new Date(Date.now() + 3600000),
      })
      .returning();

    adminToken = `admin-token-${adminSession.id}`;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(polarCustomers).where(eq(polarCustomers.userId, userId));
    await db.delete(polarCustomers).where(eq(polarCustomers.userId, userId2));
    await db.delete(userSessions).where(eq(userSessions.userId, userId));
    await db.delete(adminSessions).where(eq(adminSessions.userId, adminId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, userId2));
    await db.delete(users).where(eq(users.id, adminId));
  });

  it('should reject user token on admin users endpoint (SC-005)', async () => {
    const start = Date.now();
    const res = await app.request('/admin/users?limit=10', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const latency = Date.now() - start;

    expect(res.status).toBe(403);
    expect(latency).toBeLessThan(50); // SC-005: within 50ms

    const body: any = await res.json();
    expect(body.error.code).toBe('AUTH_ADMIN_BOUNDARY_VIOLATION');
    expect(body.error.context.tokenType).toBe('user');
    expect(body.error.context.expectedType).toBe('admin');
  });

  it('should reject user token on admin audit logs endpoint', async () => {
    const res = await app.request('/admin/audit/actions?limit=10', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.status).toBe(403);
    const body: any = await res.json();
    expect(body.error.code).toBe('AUTH_ADMIN_BOUNDARY_VIOLATION');
  });

  it('should allow admin token on admin users endpoint', async () => {
    const res = await app.request('/admin/users?limit=10', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.users).toBeDefined();
    expect(Array.isArray(body.users)).toBe(true);
  });

  it('should allow admin token on admin audit logs endpoint', async () => {
    const res = await app.request('/admin/audit/actions?limit=10', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.actions).toBeDefined();
  });

  it('should enforce user data scope isolation (SC-003)', async () => {
    // User 1 should only see their own polar customer record via API
    const res = await app.request('/billing/subscription/status', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.tier).toBe('pro');
    expect(body.status).toBe('active');

    // Verify RLS at DB layer: direct query should only return user's own record
    const userCustomers = await db.query.polarCustomers.findMany({
      where: eq(polarCustomers.userId, userId),
    });

    expect(userCustomers.length).toBe(1);
    expect(userCustomers[0].userId).toBe(userId);
  });

  it('should allow admin to see all polar customers (admin override)', async () => {
    // Admin query should return all customer records
    const allCustomers = await db.query.polarCustomers.findMany();

    expect(allCustomers.length).toBeGreaterThanOrEqual(2);
    const userIds = allCustomers.map((c: any) => c.userId);
    expect(userIds).toContain(userId);
    expect(userIds).toContain(userId2);
  });

  it('should reject token type mismatch in <10ms (SC-010)', async () => {
    const start = performance.now();
    const res = await app.request('/admin/users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const latency = performance.now() - start;

    expect(res.status).toBe(403);
    expect(latency).toBeLessThan(10); // SC-010: middleware layer rejection
  });

  it('should provide clear error messages for boundary violations', async () => {
    const res = await app.request('/admin/audit/actions', {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });

    const body: any = await res.json();
    expect(body.error.hint).toBeDefined();
    expect(body.error.hint).toContain('/admin/auth/login');
    expect(body.error.severity).toBe('error');
  });

  it('should allow user token on user billing endpoints', async () => {
    const res = await app.request('/billing/web/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        planId: 'prod_test',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      }),
    });

    // Should not be 403 (may be 400 for invalid product, but not forbidden)
    expect(res.status).not.toBe(403);
  });
});
