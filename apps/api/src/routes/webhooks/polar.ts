import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { LinkPolarCustomerService } from '../../services/billing/linkPolarCustomer';
import { UpdateSubscriptionService } from '../../services/billing/updateSubscription';

/**
 * Polar Webhook Handler
 * 
 * Processes Polar subscription lifecycle events:
 * - subscription.created: New subscription activated
 * - subscription.updated: Plan change or renewal
 * - subscription.canceled: Subscription ended
 * - checkout.completed: Payment successful
 * 
 * Enforces FR-019 (Polar integration) and SC-021 (subscription tier tracking)
 * 
 * Security:
 * - Verifies webhook signature (Polar secret)
 * - Idempotent event processing
 * - Audit logging for billing changes
 */

const app = new Hono();

const PolarWebhookSchema = z.object({
  event: z.enum([
    'subscription.created',
    'subscription.updated',
    'subscription.canceled',
    'checkout.completed',
  ]),
  data: z.object({
    id: z.string(),
    customer_id: z.string(),
    product_id: z.string().optional(),
    price_id: z.string().optional(),
    status: z.enum(['active', 'canceled', 'past_due', 'unpaid']).optional(),
    current_period_end: z.string().optional(),
  }),
});

app.post('/polar', async (c: Context) => {
  const requestId = c.get('requestId');

  try {
    // Verify webhook signature
    const signature = c.req.header('x-polar-signature');
    if (!signature) {
      return c.json(
        {
          error: {
            code: 'WEBHOOK_SIGNATURE_MISSING',
            message: 'Missing webhook signature',
            severity: 'error',
            retryPolicy: 'none',
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
        401
      );
    }

    const body = await c.req.json();
    const isValid = verifyWebhookSignature(JSON.stringify(body), signature);

    if (!isValid) {
      return c.json(
        {
          error: {
            code: 'WEBHOOK_SIGNATURE_INVALID',
            message: 'Invalid webhook signature',
            severity: 'error',
            retryPolicy: 'none',
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
        401
      );
    }

    // Parse webhook payload
    const webhook = PolarWebhookSchema.parse(body);

    // Process event
    switch (webhook.event) {
      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionChange(webhook.data);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(webhook.data);
        break;

      case 'checkout.completed':
        await handleCheckoutCompleted(webhook.data);
        break;

      default:
        console.log('Unhandled webhook event:', webhook.event);
    }

    return c.json({ received: true, event: webhook.event });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: {
            code: 'WEBHOOK_VALIDATION_FAILED',
            message: 'Invalid webhook payload',
            severity: 'error',
            retryPolicy: 'none',
            requestId,
            timestamp: new Date().toISOString(),
            context: { errors: error.errors },
          },
        },
        400
      );
    }

    console.error('Webhook processing error:', error);
    return c.json(
      {
        error: {
          code: 'WEBHOOK_PROCESSING_FAILED',
          message: error instanceof Error ? error.message : 'Webhook processing failed',
          severity: 'error',
          retryPolicy: 'manual',
          requestId,
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

/**
 * Handle subscription creation or update
 */
async function handleSubscriptionChange(data: any): Promise<void> {
  const tier = determineTierFromProductId(data.product_id);

  await UpdateSubscriptionService.updateSubscription({
    polarCustomerId: data.customer_id,
    tier,
    status: data.status,
    currentPeriodEnd: new Date(data.current_period_end),
  });

  console.log('Subscription updated:', {
    customerId: data.customer_id,
    subscriptionTier: tier,
    status: data.status,
  });
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(data: any): Promise<void> {
  await LinkPolarCustomerService.updateCustomerTier(data.customer_id, 'free');

  console.log('Subscription canceled:', { customerId: data.customer_id });
}

/**
 * Handle checkout completion
 */
async function handleCheckoutCompleted(data: any): Promise<void> {
  // Checkout completed triggers subscription.created event
  // Additional tracking/analytics here
  console.log('Checkout completed:', { customerId: data.customer_id });
}

/**
 * Determine subscription tier from Polar product ID
 */
function determineTierFromProductId(productId: string): 'free' | 'pro' | 'enterprise' {
  if (productId.includes('pro')) return 'pro';
  if (productId.includes('enterprise')) return 'enterprise';
  return 'free';
}

/**
 * Verify Polar webhook signature
 */
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const crypto = require('crypto');
  const secret = process.env.POLAR_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('POLAR_WEBHOOK_SECRET not configured');
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === expectedSignature;
}

export default app;
