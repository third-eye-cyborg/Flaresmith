/**
 * ComponentVariantService
 * Implements T034: getVariants(), createVariant(), updateAccessibilityStatus()
 */
import { eq, and } from 'drizzle-orm';
import { db } from '../../../db/connection';
import { componentVariants } from '../../../db/schema/designSystem';
import { accessibilityStatusEnum } from '../../../db/schema/designSystem';
import type { ComponentVariant as ComponentVariantRow } from '../../../db/schema/designSystem';
import { BaseDesignSystemService } from './auditService';

export interface CreateVariantParams {
  component: string;
  variant: string;
  tokensUsed: string[];
}

export class ComponentVariantService extends BaseDesignSystemService {
  async getVariants(component?: string): Promise<ComponentVariantRow[]> {
    return this.withRetry(async () => {
      if (component) {
        return await db.select().from(componentVariants).where(eq(componentVariants.component, component));
      }
      return await db.select().from(componentVariants);
    });
  }

  async createVariant(params: CreateVariantParams): Promise<ComponentVariantRow> {
    return this.withRetry(async () => {
      // Check if exists
      const existing = await db
        .select()
        .from(componentVariants)
        .where(and(eq(componentVariants.component, params.component), eq(componentVariants.variant, params.variant)))
        .limit(1);
      if (existing.length > 0) {
        return existing[0];
      }
      const [row] = await db
        .insert(componentVariants)
        .values({
          component: params.component,
          variant: params.variant,
          tokensUsed: params.tokensUsed,
          accessibilityStatus: 'pass',
        })
        .returning();
      return row;
    });
  }

  async updateAccessibilityStatus(id: string, status: 'pass' | 'warn' | 'fail'): Promise<ComponentVariantRow | null> {
    return this.withRetry(async () => {
      const [updated] = await db
        .update(componentVariants)
        .set({ accessibilityStatus: status })
        .where(eq(componentVariants.id, id))
        .returning();
      return updated ?? null;
    });
  }
}

export const componentVariantService = new ComponentVariantService();
/**
 * ComponentVariantService (T034)
 * Feature: 004-design-system (US2)
 * Provides CRUD-style operations for component variants.
 */
import { and, eq } from 'drizzle-orm';
import { db } from '../../../db/connection';
import { componentVariants } from '../../../db/schema/designSystem';
import { BaseDesignSystemService } from './auditService';
import type { AccessibilityStatus } from '@flaresmith/types';

export interface CreateComponentVariantInput {
  component: string;
  variant: string;
  tokensUsed: string[];
  accessibilityStatus?: AccessibilityStatus;
}

export interface ComponentVariantRecord {
  id: string;
  component: string;
  variant: string;
  tokens_used: string[];
  accessibility_status: AccessibilityStatus;
  created_at: string;
}

export class ComponentVariantService extends BaseDesignSystemService {
  async getVariants(component?: string): Promise<ComponentVariantRecord[]> {
    return this.withRetry(async () => {
      let query = db.select().from(componentVariants);
      if (component) {
        query = query.where(eq(componentVariants.component, component)) as typeof query;
      }
      const rows = await query;
      return rows.map(r => ({
        id: r.id,
        component: r.component,
        variant: r.variant,
        tokens_used: r.tokensUsed as string[],
        accessibility_status: r.accessibilityStatus as AccessibilityStatus,
        created_at: r.createdAt.toISOString(),
      }));
    });
  }

  async createVariant(input: CreateComponentVariantInput): Promise<ComponentVariantRecord> {
    return this.withRetry(async () => {
      const [inserted] = await db.insert(componentVariants).values({
        component: input.component,
        variant: input.variant,
        tokensUsed: input.tokensUsed,
        accessibilityStatus: (input.accessibilityStatus || 'pass') as any,
      }).returning();
      if (!inserted) throw new Error('Failed to insert component variant');
      await this.logAuditEvent({
        type: 'design.component.variant.created' as any,
        metadata: {
          component: input.component,
          variant: input.variant,
          tokenCount: input.tokensUsed.length,
        }
      });
      return {
        id: inserted.id,
        component: inserted.component,
        variant: inserted.variant,
        tokens_used: inserted.tokensUsed as string[],
        accessibility_status: inserted.accessibilityStatus as AccessibilityStatus,
        created_at: inserted.createdAt.toISOString(),
      };
    });
  }

  async updateAccessibilityStatus(id: string, status: AccessibilityStatus): Promise<boolean> {
    return this.withRetry(async () => {
      const result = await db.update(componentVariants).set({ accessibilityStatus: status as any }).where(eq(componentVariants.id, id));
      await this.logAuditEvent({
        type: 'design.component.variant.updated' as any,
        metadata: { id, accessibility_status: status }
      });
      return !!result;
    });
  }
}

export const componentVariantService = new ComponentVariantService();
