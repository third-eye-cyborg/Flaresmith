import { db } from '../../../db/connection';
import { polarCustomers } from '../../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Subscription Update Service
 * 
 * Updates user subscription status based on Polar webhook events.
 * 
 * Triggered by:
 * - T073: Polar webhook handler
 * - Mobile receipt validation (T077)
 * 
 * Enforces SC-021 (subscription tier tracking)
 */

interface UpdateSubscriptionInput {
  polarCustomerId: string;
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  currentPeriodEnd: Date;
}

export class UpdateSubscriptionService {
  /**
   * Update subscription tier and status
   * Idempotent: safe to call multiple times with same data
   */
  static async updateSubscription(input: UpdateSubscriptionInput): Promise<void> {
    await db
      .update(polarCustomers)
      .set({
        subscriptionTier: input.tier,
        subscriptionStatus: input.status,
        currentPeriodEnd: input.currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(polarCustomers.polarCustomerId, input.polarCustomerId));

    console.log('Subscription updated:', {
      polarCustomerId: input.polarCustomerId,
      tier: input.tier,
      status: input.status,
    });
  }

  /**
   * Get current subscription status
   */
  static async getSubscriptionStatus(
    polarCustomerId: string
  ): Promise<{
    tier: string;
    status: string;
    currentPeriodEnd: Date | null;
  } | null> {
    const customer = await db.query.polarCustomers.findFirst({
      where: eq(polarCustomers.polarCustomerId, polarCustomerId),
      columns: {
        subscriptionTier: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
      },
    });

    if (!customer) return null;

    return {
      tier: customer.subscriptionTier,
      status: customer.subscriptionStatus || 'inactive',
      currentPeriodEnd: customer.currentPeriodEnd,
    };
  }

  /**
   * Downgrade to free tier (cancellation)
   */
  static async downgradeToFree(polarCustomerId: string): Promise<void> {
    await db
      .update(polarCustomers)
      .set({
        subscriptionTier: 'free',
        subscriptionStatus: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(polarCustomers.polarCustomerId, polarCustomerId));
  }
}
