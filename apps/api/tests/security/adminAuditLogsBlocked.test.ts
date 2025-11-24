/**
 * Admin Audit Logs Direct Query Blocking Test (T089)
 * 
 * Validates SC-003: Standard users cannot access admin-only tables.
 * 
 * Tests that RLS policies prevent standard users from:
 * - SELECT admin_audit_logs
 * - INSERT admin_audit_logs
 * - UPDATE admin_audit_logs
 * - DELETE admin_audit_logs
 * 
 * Expected behavior:
 * - User token → /admin/* endpoints = 403 Forbidden (application layer)
 * - Direct SQL query attempts from user context = 0 rows (RLS layer)
 * - Admin token → admin_audit_logs = full access
 * 
 * NOTE: Requires TEST_DATABASE_URL with real Neon Postgres connection.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { adminAuditLogs } from '../../db/schema/adminAuditLogs';
import { users, organizations } from '../../db/schema/base';
import { v4 as uuidv4 } from 'uuid';

describe.skip('Admin Audit Logs RLS Blocking (SC-003)', () => {
  const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

  if (!TEST_DATABASE_URL) {
    console.warn('⚠️  Skipping admin audit logs tests: TEST_DATABASE_URL not set');
    return;
  }

  const sql = neon(TEST_DATABASE_URL);
  const db = drizzle(sql, { schema: { adminAuditLogs, users, organizations } }) as any;

  let testOrgId: string;
  let testUserId: string;
  let testAdminId: string;
  let testAuditLogId: string;

  beforeAll(async () => {
    // Create test organization
    testOrgId = uuidv4();
    await db.insert(organizations).values({
      id: testOrgId,
      name: 'Test Org',
      slug: 'test-org-' + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create test user (standard role)
    testUserId = uuidv4();
    await db.insert(users).values({
      id: testUserId,
      orgId: testOrgId,
      email: 'user@test.com',
      displayName: 'Test User',
      roles: ['viewer'],
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create test admin (admin role)
    testAdminId = uuidv4();
    await db.insert(users).values({
      id: testAdminId,
      orgId: testOrgId,
      email: 'admin@test.com',
      displayName: 'Test Admin',
      roles: ['admin'],
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create test audit log (admin context)
    testAuditLogId = uuidv4();
    await db.insert(adminAuditLogs).values({
      id: testAuditLogId,
      adminUserId: testAdminId,
      actionType: 'test.action',
      entityType: 'test',
      entityId: uuidv4(),
      changesJson: {},
      ipAddress: '127.0.0.1',
      createdAt: new Date(),
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testAuditLogId) {
      await db.delete(adminAuditLogs).where(eq(adminAuditLogs.id, testAuditLogId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
    if (testAdminId) {
      await db.delete(users).where(eq(users.id, testAdminId));
    }
    if (testOrgId) {
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    }
  });

  describe('User context (should be blocked by RLS)', () => {
    it('should return 0 rows when user tries to SELECT admin_audit_logs', async () => {
      // Simulate user session context (RLS filters by role)
      // In production, SET LOCAL role would be applied by middleware
      const result = await sql`
        SET LOCAL role = 'authenticated';
        SELECT * FROM admin_audit_logs WHERE id = ${testAuditLogId};
      `;

      expect(result).toHaveLength(0);
    });

    it('should fail when user tries to INSERT admin_audit_logs', async () => {
      const newLogId = uuidv4();

      await expect(async () => {
        await sql`
          SET LOCAL role = 'authenticated';
          INSERT INTO admin_audit_logs (
            id, admin_user_id, action_type, entity_type, entity_id, 
            changes_json, ip_address, created_at
          ) VALUES (
            ${newLogId}, ${testUserId}, 'unauthorized.action', 'test', ${uuidv4()},
            '{}', '127.0.0.1', NOW()
          );
        `;
      }).rejects.toThrow();
    });

    it('should fail when user tries to UPDATE admin_audit_logs', async () => {
      await expect(async () => {
        await sql`
          SET LOCAL role = 'authenticated';
          UPDATE admin_audit_logs 
          SET changes_json = '{"modified": true}'
          WHERE id = ${testAuditLogId};
        `;
      }).rejects.toThrow();
    });

    it('should fail when user tries to DELETE admin_audit_logs', async () => {
      await expect(async () => {
        await sql`
          SET LOCAL role = 'authenticated';
          DELETE FROM admin_audit_logs WHERE id = ${testAuditLogId};
        `;
      }).rejects.toThrow();
    });

    it('should return 0 rows when user tries COUNT(*) on admin_audit_logs', async () => {
      const result = await sql`
        SET LOCAL role = 'authenticated';
        SELECT COUNT(*) as count FROM admin_audit_logs;
      `;

      expect(result[0]?.count).toBe('0');
    });
  });

  describe('Admin context (should have full access)', () => {
    it('should return audit log when admin tries to SELECT admin_audit_logs', async () => {
      const result = await sql`
        SET LOCAL role = 'admin';
        SELECT * FROM admin_audit_logs WHERE id = ${testAuditLogId};
      `;

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(testAuditLogId);
      expect(result[0]?.action_type).toBe('test.action');
    });

    it('should succeed when admin tries to INSERT admin_audit_logs', async () => {
      const newLogId = uuidv4();

      await sql`
        SET LOCAL role = 'admin';
        INSERT INTO admin_audit_logs (
          id, admin_user_id, action_type, entity_type, entity_id, 
          changes_json, ip_address, created_at
        ) VALUES (
          ${newLogId}, ${testAdminId}, 'admin.authorized.action', 'test', ${uuidv4()},
          '{}', '127.0.0.1', NOW()
        );
      `;

      const inserted = await sql`SELECT * FROM admin_audit_logs WHERE id = ${newLogId}`;
      expect(inserted).toHaveLength(1);

      // Cleanup
      await sql`DELETE FROM admin_audit_logs WHERE id = ${newLogId}`;
    });

    it('should succeed when admin tries to UPDATE admin_audit_logs', async () => {
      await sql`
        SET LOCAL role = 'admin';
        UPDATE admin_audit_logs 
        SET changes_json = '{"modified_by_admin": true}'
        WHERE id = ${testAuditLogId};
      `;

      const updated = await sql`SELECT * FROM admin_audit_logs WHERE id = ${testAuditLogId}`;
      expect(updated[0]?.changes_json).toMatchObject({ modified_by_admin: true });
    });

    it('should return correct count when admin queries COUNT(*)', async () => {
      const result = await sql`
        SET LOCAL role = 'admin';
        SELECT COUNT(*) as count FROM admin_audit_logs WHERE admin_user_id = ${testAdminId};
      `;

      const count = parseInt(result[0]?.count || '0', 10);
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Data isolation verification (SC-003)', () => {
    it('should enforce zero-visibility for user queries on admin tables', async () => {
      // User attempts to query all audit logs
      const userResult = await sql`
        SET LOCAL role = 'authenticated';
        SELECT id, action_type, admin_user_id FROM admin_audit_logs LIMIT 100;
      `;

      expect(userResult).toHaveLength(0);

      // Admin can see all audit logs
      const adminResult = await sql`
        SET LOCAL role = 'admin';
        SELECT id, action_type, admin_user_id FROM admin_audit_logs LIMIT 100;
      `;

      expect(adminResult.length).toBeGreaterThanOrEqual(1);
    });

    it('should maintain isolation even with JOIN queries', async () => {
      // User attempts to join users + admin_audit_logs
      const userJoinResult = await sql`
        SET LOCAL role = 'authenticated';
        SELECT u.id, u.email, a.action_type
        FROM users u
        LEFT JOIN admin_audit_logs a ON a.admin_user_id = u.id
        WHERE u.id = ${testAdminId};
      `;

      // User should see the user record but NO audit log data
      expect(userJoinResult).toHaveLength(1);
      expect(userJoinResult[0]?.action_type).toBeNull();

      // Admin can see both user record AND audit log data
      const adminJoinResult = await sql`
        SET LOCAL role = 'admin';
        SELECT u.id, u.email, a.action_type
        FROM users u
        LEFT JOIN admin_audit_logs a ON a.admin_user_id = u.id
        WHERE u.id = ${testAdminId};
      `;

      expect(adminJoinResult.length).toBeGreaterThanOrEqual(1);
      const rowWithAction = adminJoinResult.find((r: any) => r.action_type === 'test.action');
      expect(rowWithAction).toBeDefined();
    });
  });
});
