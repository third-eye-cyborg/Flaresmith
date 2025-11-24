/**
 * T049: Override Rate Limit Service
 * Feature: 004-design-system
 * FR-025 - Enforce per-project override submission limits.
 *
 * Daily limits: Standard 20, Premium 40
 * Hourly burst: 5 (both tiers)
 */

import { BaseDesignSystemService } from './auditService';
import { and, eq, gte } from 'drizzle-orm';
import { db } from '../../../db/connection';
import { themeOverrides } from '../../../db/schema/designSystem';

export interface RateLimitCheckParams {
  projectId: string;
  isPremium: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingDay: number;
  remainingHour: number;
  dailyLimit: number;
  hourLimit: number;
  usedDay: number;
  usedHour: number;
  reason?: string;
}

export class OverrideRateLimitService extends BaseDesignSystemService {
  private DAILY_LIMIT_STANDARD = 20;
  private DAILY_LIMIT_PREMIUM = 40;
  private HOURLY_LIMIT = 5;

  /**
   * Check current override submission rate limits for a project.
   */
  async checkRateLimit(params: RateLimitCheckParams): Promise<RateLimitResult> {
    return this.withRetry(async () => {
      const dailyLimit = params.isPremium ? this.DAILY_LIMIT_PREMIUM : this.DAILY_LIMIT_STANDARD;
      const hourLimit = this.HOURLY_LIMIT;

      const now = new Date();
      const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Count submissions today
      const todayOverrides = await db
        .select({ id: themeOverrides.id })
        .from(themeOverrides)
        .where(and(eq(themeOverrides.projectId, params.projectId), gte(themeOverrides.createdAt, startOfDayUTC)));

      // Count submissions last hour
      const hourOverrides = await db
        .select({ id: themeOverrides.id })
        .from(themeOverrides)
        .where(and(eq(themeOverrides.projectId, params.projectId), gte(themeOverrides.createdAt, oneHourAgo)));

      const usedDay = todayOverrides.length;
      const usedHour = hourOverrides.length;

      const remainingDay = Math.max(dailyLimit - usedDay, 0);
      const remainingHour = Math.max(hourLimit - usedHour, 0);

      let allowed = true;
      let reason: string | undefined;

      if (remainingDay <= 0) {
        allowed = false;
        reason = 'Daily override submission limit exceeded';
      } else if (remainingHour <= 0) {
        allowed = false;
        reason = 'Hourly override burst limit exceeded';
      }

      const result: RateLimitResult = {
        allowed,
        remainingDay,
        remainingHour,
        dailyLimit,
        hourLimit,
        usedDay,
        usedHour,
      };
      if (reason) result.reason = reason;
      return result;
    });
  }
}

export const overrideRateLimitService = new OverrideRateLimitService();
