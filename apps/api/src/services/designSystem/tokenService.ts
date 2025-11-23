/**
 * T018: Token Service
 * Feature: 004-design-system
 * User Story: US1 - Core Token Unification
 * 
 * Service layer for design token operations: retrieval, versioning, creation.
 */

import { eq } from 'drizzle-orm';
import { db } from '../../../db/connection';
import { designTokens, designTokenVersions } from '../../../db/schema';
import type { DesignToken, DesignTokenCategory } from '@flaresmith/types';
import { hashTokenSet } from '@flaresmith/utils';
import { BaseDesignSystemService } from './auditService';

/**
 * Token service for design system operations
 */
export class TokenService extends BaseDesignSystemService {
  /**
   * Get all tokens or filter by category/version
   * 
   * @param options - Query options
   * @returns Token array and version
   */
  async getTokens(options?: {
    category?: DesignTokenCategory;
    version?: number;
    correlationId?: string;
  }): Promise<{
    version: number;
    tokens: DesignToken[];
  }> {
    const correlationId = options?.correlationId || crypto.randomUUID();
    const start = Date.now();
    return this.withRetry(async () => {
      let query = db.select().from(designTokens);

      // Filter by category if specified
      if (options?.category) {
        query = query.where(eq(designTokens.category, options.category)) as typeof query;
      }

      // If specific version requested, filter by version
      if (options?.version) {
        query = query.where(eq(designTokens.version, options.version)) as typeof query;
      }

      const tokens = await query;

      // Get current version (max version from tokens or specified version)
      const version = options?.version || Math.max(...tokens.map((t: typeof designTokens.$inferSelect) => t.version), 1);
      const mapped = tokens.map(this.mapToDesignToken);
      const durationMs = Date.now() - start;
      await this.logAuditEvent({
        type: 'design.tokens.retrieved',
        correlationId,
        version,
        metadata: {
          category: options?.category,
          requestedVersion: options?.version,
          count: mapped.length,
          durationMs,
        },
        durationMs,
      });
      return { version, tokens: mapped };
    });
  }

  /**
   * Get tokens by category
   * 
   * @param category - Token category
   * @param version - Optional version filter
   * @returns Token array
   */
  async getTokensByCategory(
    category: DesignTokenCategory,
    version?: number
  ): Promise<DesignToken[]> {
    const options: { category: DesignTokenCategory; version?: number } = { category };
    if (version !== undefined) {
      options.version = version;
    }
    const result = await this.getTokens(options);
    return result.tokens;
  }

  /**
   * Get specific token version snapshot
   * 
   * @param version - Version number
   * @returns Version snapshot or null
   */
  async getTokenVersion(version: number): Promise<{
    id: string;
    version: number;
    snapshot: Record<string, unknown>;
    hash: string;
    createdBy: string;
    createdAt: string;
  } | null> {
    return this.withRetry(async () => {
      const [versionRecord] = await db
        .select()
        .from(designTokenVersions)
        .where(eq(designTokenVersions.version, version))
        .limit(1);

      if (!versionRecord) {
        return null;
      }

      return {
        id: versionRecord.id,
        version: versionRecord.version,
        snapshot: versionRecord.snapshot as Record<string, unknown>,
        hash: versionRecord.hash,
        createdBy: versionRecord.createdBy,
        createdAt: versionRecord.createdAt.toISOString(),
      };
    });
  }

  /**
   * Create new token version snapshot
   * 
   * @param params - Version creation parameters
   * @returns Created version snapshot
   */
  async createTokenVersion(params: {
    tokens: DesignToken[];
    createdBy: string;
  }): Promise<{
    id: string;
    version: number;
    hash: string;
  }> {
    return this.withRetry(async () => {
      // Get current max version
      const existingVersions = await db
        .select()
        .from(designTokenVersions)
        .orderBy(designTokenVersions.version);

      const newVersion = existingVersions.length > 0
        ? Math.max(...existingVersions.map((v: typeof designTokenVersions.$inferSelect) => v.version)) + 1
        : 1;

      // Build normalized snapshot
      const snapshot = Object.fromEntries(
        params.tokens.map(t => [
          t.name,
          { category: t.category, value: t.value },
        ])
      );

      // Compute hash
      const hash = hashTokenSet(params.tokens);

      // Insert version snapshot
      const [versionRecord] = await db
        .insert(designTokenVersions)
        .values({
          version: newVersion,
          snapshot,
          hash,
          createdBy: params.createdBy,
        })
        .returning();

      if (!versionRecord) {
        throw new Error('Failed to create token version');
      }

      return {
        id: versionRecord.id,
        version: versionRecord.version,
        hash: versionRecord.hash,
      };
    });
  }

  /**
   * Update token values and create new version
   * 
   * @param params - Update parameters
   * @returns New version info
   */
  async updateTokens(params: {
    updates: Array<{ name: string; value: unknown }>;
    createdBy: string;
  }): Promise<{
    version: number;
    hash: string;
    updatedCount: number;
  }> {
    return this.withRetry(async () => {
      // Get current tokens
      const { tokens: currentTokens, version: currentVersion } = await this.getTokens();

      // Apply updates
      const updatedTokens = currentTokens.map(token => {
        const update = params.updates.find(u => u.name === token.name);
        if (update) {
          return {
            ...token,
            value: update.value as string | number | Record<string, unknown>,
            updated_at: new Date().toISOString(),
          };
        }
        return token;
      });

      // Update tokens in database
      let updatedCount = 0;
      for (const update of params.updates) {
        const result = await db
          .update(designTokens)
          .set({
            value: update.value as unknown as Record<string, unknown>,
            version: currentVersion + 1,
            updatedAt: new Date(),
          })
          .where(eq(designTokens.name, update.name));

        if (result) updatedCount++;
      }

      // Create new version snapshot
      const versionInfo = await this.createTokenVersion({
        tokens: updatedTokens,
        createdBy: params.createdBy,
      });

      return {
        version: versionInfo.version,
        hash: versionInfo.hash,
        updatedCount,
      };
    });
  }

  /**
   * Get latest version number
   * 
   * @returns Latest version number
   */
  async getLatestVersion(): Promise<number> {
    return this.withRetry(async () => {
      const versions = await db
        .select()
        .from(designTokenVersions)
        .orderBy(designTokenVersions.version);

      return versions.length > 0
        ? Math.max(...versions.map((v: typeof designTokenVersions.$inferSelect) => v.version))
        : 1;
    });
  }

  /**
   * Map database record to DesignToken type
   */
  private mapToDesignToken(record: typeof designTokens.$inferSelect): DesignToken {
    return {
      id: record.id,
      name: record.name,
      category: record.category as DesignTokenCategory,
      value: record.value as string | number | Record<string, unknown>,
      version: record.version,
      accessibility_meta: record.accessibilityMeta as Record<string, unknown> | undefined,
      created_at: record.createdAt.toISOString(),
      updated_at: record.updatedAt.toISOString(),
    };
  }
}

// Export singleton instance
export const tokenService = new TokenService();
