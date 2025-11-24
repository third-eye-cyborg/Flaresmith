import { eq, SQL } from 'drizzle-orm';
import type { DbConnection } from '../../../db/connection';
import { users } from '../../../db/schema';

/**
 * Role-Based Data Access Service (T084)
 * 
 * Implements user data scope filtering based on auth role.
 * Enforces FR-013: RLS-like behavior at application layer for additional defense.
 * 
 * Security Model:
 * - Admin users (role='admin'): See all data across all tables
 * - Standard users (role='user'): See only records where user_id matches auth.uid()
 * - Database RLS provides underlying enforcement; this service adds application-layer validation
 * 
 * Usage:
 * ```ts
 * const scope = await roleDataScope.getUserDataScope(db, userId);
 * if (scope.role === 'user') {
 *   // Apply user_id filter to query
 *   const filtered = query.where(eq(table.userId, userId));
 * }
 * ```
 */

export interface UserDataScope {
  userId: string;
  role: 'admin' | 'user';
  canAccessAllData: boolean;
}

export class RoleDataScopeService {
  /**
   * Get user's data access scope based on their role
   * 
   * @param db - Database connection
   * @param userId - User ID from authenticated session
   * @returns UserDataScope with role and access permissions
   * @throws Error if user not found
   */
  async getUserDataScope(db: DbConnection, userId: string): Promise<UserDataScope> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return {
      userId: user.id,
      role: user.role as 'admin' | 'user',
      canAccessAllData: user.role === 'admin',
    };
  }

  /**
   * Enforce RLS-like filtering at application layer
   * 
   * Returns SQL condition to apply to queries based on user scope:
   * - Admin users: No additional filter (can see all)
   * - Standard users: user_id = {userId}
   * 
   * @param scope - User data scope from getUserDataScope()
   * @param userIdColumn - Column reference for user_id in target table
   * @returns SQL condition to apply, or undefined for admin (no filter)
   * 
   * @example
   * const condition = enforceRLS(scope, polarCustomers.userId);
   * const query = db.select().from(polarCustomers).where(condition);
   */
  enforceRLS(scope: UserDataScope, userIdColumn: any): SQL | undefined {
    if (scope.canAccessAllData) {
      return undefined; // Admin override - no filter
    }
    return eq(userIdColumn, scope.userId);
  }

  /**
   * Check if user can perform admin-only operations
   * 
   * @param scope - User data scope
   * @returns true if admin, false otherwise
   * @throws Error with code ADMIN_ACCESS_REQUIRED if not admin
   */
  adminOverride(scope: UserDataScope): boolean {
    if (!scope.canAccessAllData) {
      throw new Error('ADMIN_ACCESS_REQUIRED');
    }
    return true;
  }

  /**
   * Apply user scope filter to a query builder
   * 
   * Convenience method that wraps enforceRLS for common use case.
   * 
   * @param scope - User data scope
   * @param query - Query builder object with .where() method
   * @param userIdColumn - Column reference for user_id in target table
   * @returns Modified query with RLS filter applied (for standard users) or original query (for admins)
   * 
   * @example
   * let query = db.select().from(polarCustomers);
   * query = applyScopeFilter(scope, query, polarCustomers.userId);
   * const results = await query;
   */
  applyScopeFilter(scope: UserDataScope, query: any, userIdColumn: any): any {
    const condition = this.enforceRLS(scope, userIdColumn);
    return condition ? query.where(condition) : query;
  }

  /**
   * Validate that current user can access a specific resource
   * 
   * @param scope - User data scope
   * @param resourceOwnerId - Owner user_id of the resource being accessed
   * @returns true if access allowed, false otherwise
   * @throws Error with code ACCESS_DENIED if standard user tries to access another user's resource
   */
  validateResourceAccess(scope: UserDataScope, resourceOwnerId: string): boolean {
    if (scope.canAccessAllData) {
      return true; // Admin can access any resource
    }

    if (scope.userId !== resourceOwnerId) {
      throw new Error('ACCESS_DENIED');
    }

    return true;
  }

  /**
   * Get admin audit context for logging sensitive operations
   * 
   * @param scope - User data scope
   * @returns Object with admin_user_id if admin, null otherwise
   */
  getAuditContext(scope: UserDataScope): { admin_user_id: string | null } {
    return {
      admin_user_id: scope.canAccessAllData ? scope.userId : null,
    };
  }
}

export const roleDataScopeService = new RoleDataScopeService();
