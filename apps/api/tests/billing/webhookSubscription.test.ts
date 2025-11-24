import { describe, it, expect, beforeAll } from 'vitest';
import app from '../../src/app';
import { db } from '../../src/db/client';
import { polarCustomers, users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Subscription Webhook Test (T082)
 * Validates webhook processing updates subscription tier & status.
 * 
 * NOTE: Requires TEST_DATABASE_URL environment variable with a real Neon database connection.
 * Tests are currently skipped until test database infrastructure is set up.
 * See: specs/005-dual-auth-architecture/tasks.md T082
 */

describe.skip('Polar Webhook Subscription Processing (requires test DB)', () => {
  let secret: string;
  let polarCustomerId: string;
  let userId: string;

  beforeAll(async () => {
    secret = 'test_polar_secret';
    process.env.POLAR_WEBHOOK_SECRET = secret;

    // Create user & polar customer linkage stub
    const [user] = await db
      .insert(users)
      .values({ email: 'sub@test.com', authRole: 'user', betterAuthId: 'better-sub' })
      .returning();
    userId = user.id;

    const [customer] = await db
      .insert(polarCustomers)
      .values({
        userId,
        polarCustomerId: 'pcus_test_123',
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
      })
      .returning();

    polarCustomerId = customer.polarCustomerId;
  });

  function sign(body: any) {
    return crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');
  }

  it('should process subscription.created webhook', async () => {
    const payload = {
      event: 'subscription.created',
      data: {
        id: 'sub_evt_1',
        customer_id: polarCustomerId,
        product_id: 'product_pro_plan',
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      },
    };

    const res = await app.request('/webhooks/polar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-polar-signature': sign(payload),
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.event).toBe('subscription.created');

    const updated = await db.query.polarCustomers.findFirst({
      where: eq(polarCustomers.polarCustomerId, polarCustomerId),
    });

    expect(updated?.subscriptionTier).toBe('pro');
    expect(updated?.subscriptionStatus).toBe('active');
  });

  it('should process subscription.canceled webhook', async () => {
    const payload = {
      event: 'subscription.canceled',
      data: {
        id: 'sub_evt_2',
        customer_id: polarCustomerId,
        product_id: 'product_pro_plan',
        status: 'canceled',
        current_period_end: new Date().toISOString(),
      },
    };

    const res = await app.request('/webhooks/polar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-polar-signature': sign(payload),
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);

    const updated = await db.query.polarCustomers.findFirst({
      where: eq(polarCustomers.polarCustomerId, polarCustomerId),
    });

    expect(updated?.subscriptionTier).toBe('free');
  });
});
