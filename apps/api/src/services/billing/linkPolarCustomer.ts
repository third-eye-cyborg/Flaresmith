import { db } from '../../../db/connection';
import { users, polarCustomers } from '../../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Polar Customer Linking Service
 * 
 * Creates Polar customer records and links them to Flaresmith users.
 * 
 * Triggered by:
 * - User registration (T068 Better Auth signup)
 * - OAuth callback (T070)
 * 
 * Enforces FR-019 (Polar customer linkage) and SC-021 (subscription tier tracking)
 */

interface PolarCustomerInput {
  userId: string;
  email: string;
  name?: string;
}

interface PolarCustomerOutput {
  polarCustomerId: string;
  email: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
}

export class LinkPolarCustomerService {
  /**
   * Create Polar customer and link to user
   * Idempotent: returns existing customer if already linked
   */
  static async linkCustomer(input: PolarCustomerInput): Promise<PolarCustomerOutput> {
    // Check if user already has Polar customer
    const existingCustomer = await db.query.polarCustomers.findFirst({
      where: eq(polarCustomers.userId, input.userId),
    });

    if (existingCustomer) {
      // Fetch user email for output (not stored in polar_customers table per data model)
      const userRecord = await db.query.users.findFirst({ where: eq(users.id, input.userId) });
      return {
        polarCustomerId: existingCustomer.polarCustomerId,
        email: userRecord?.email || input.email,
        subscriptionTier: existingCustomer.subscriptionTier as 'free' | 'pro' | 'enterprise',
      };
    }

    // Create Polar customer via API
    const polarCustomer = await createPolarCustomer(input.email, input.name);

    // Store customer linkage
    const [newCustomer] = await db
      .insert(polarCustomers)
      .values({
        userId: input.userId,
        polarCustomerId: polarCustomer.id,
        subscriptionTier: 'free', // Default tier until subscription activated
        subscriptionStatus: 'active', // initial status - may be adjusted by webhook
      })
      .returning();

    // Update user record with Polar customer ID
    await db
      .update(users)
      .set({ polarCustomerId: polarCustomer.id })
      .where(eq(users.id, input.userId));

    return {
      polarCustomerId: newCustomer.polarCustomerId,
      email: input.email,
      subscriptionTier: 'free',
    };
  }

  /**
   * Get customer subscription status
   */
  static async getCustomerStatus(userId: string): Promise<PolarCustomerOutput | null> {
    const customer = await db.query.polarCustomers.findFirst({
      where: eq(polarCustomers.userId, userId),
    });

    if (!customer) return null;

    const userRecord = await db.query.users.findFirst({ where: eq(users.id, userId) });
    return {
      polarCustomerId: customer.polarCustomerId,
      email: userRecord?.email || 'unknown',
      subscriptionTier: customer.subscriptionTier as 'free' | 'pro' | 'enterprise',
    };
  }

  /**
   * Update customer tier (called by webhook handler T073)
   */
  static async updateCustomerTier(
    polarCustomerId: string,
    tier: 'free' | 'pro' | 'enterprise'
  ): Promise<void> {
    await db
      .update(polarCustomers)
      .set({
        subscriptionTier: tier,
        updatedAt: new Date(),
      })
      .where(eq(polarCustomers.polarCustomerId, polarCustomerId));
  }
}

/**
 * Create customer in Polar via API
 */
async function createPolarCustomer(
  email: string,
  name?: string
): Promise<{ id: string; email: string }> {
  const response = await fetch('https://api.polar.sh/v1/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.POLAR_API_KEY}`,
    },
    body: JSON.stringify({
      email,
      name,
      metadata: {
        source: 'cloudmake-user-registration',
        created_at: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Polar customer creation failed: ${error}`);
  }

  const data: any = await response.json();
  return {
    id: data.id,
    email: data.email,
  };
}
