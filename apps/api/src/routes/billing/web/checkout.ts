import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { CheckoutSessionCreateInput } from '@cloudmake/types/billing/polar';

/**
 * Web Checkout Route
 * 
 * Creates Polar checkout session for subscription purchases.
 * 
 * Enforces:
 * - FR-019: Polar billing integration
 * - SC-019: User tokens only (admin tokens rejected by userBoundary middleware)
 * - SC-021: Subscription tier tracking
 * 
 * Flow:
 * 1. Validate user token (userBoundary middleware)
 * 2. Get/create Polar customer ID
 * 3. Create checkout session with product/price
 * 4. Return checkout URL for redirect
 */

const app = new Hono();

app.post('/checkout', async (c: Context) => {
  const requestId = c.get('requestId');
  const userId = c.get('userId');
  const tokenType = c.get('tokenType');

  // Enforce user token boundary (SC-019)
  if (tokenType !== 'user') {
    return c.json(
      {
        error: {
          code: 'AUTH_USER_BOUNDARY_VIOLATION',
          message: 'User token required for billing operations',
          severity: 'error',
          retryPolicy: 'none',
          requestId,
          timestamp: new Date().toISOString(),
          context: { tokenType, expectedType: 'user' },
          hint: 'Authenticate via /user/auth/login to obtain user token',
        },
      },
      403
    );
  }

  try {
    const body = await c.req.json();
    const input = CheckoutSessionCreateInput.parse(body);

    // Get user's Polar customer ID
    const polarCustomerId = await getUserPolarCustomerId(userId);

    // Create Polar checkout session
    const checkoutSession = await createPolarCheckoutSession({
      customerId: polarCustomerId,
      planId: input.planId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    return c.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      expiresAt: checkoutSession.expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: {
            code: 'BILLING_VALIDATION_FAILED',
            message: 'Invalid checkout parameters',
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

    return c.json(
      {
        error: {
          code: 'BILLING_CHECKOUT_FAILED',
          message: error instanceof Error ? error.message : 'Checkout creation failed',
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
 * Get user's Polar customer ID
 * Creates customer if not exists
 */
async function getUserPolarCustomerId(userId: string): Promise<string> {
  // This would query the polar_customers table
  // For now, placeholder implementation
  const customerId = `cust_${userId}`;
  return customerId;
}

/**
 * Create Polar checkout session
 */
async function createPolarCheckoutSession(params: {
  customerId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string; expiresAt: string }> {
  const response = await fetch('https://api.polar.sh/v1/checkouts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.POLAR_API_KEY}`,
    },
    body: JSON.stringify({
      customer_id: params.customerId,
      plan_id: params.planId,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        source: 'cloudmake-web',
        created_at: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Polar checkout creation failed: ${error}`);
  }

  const data: any = await response.json();
  return {
    id: data.id,
    url: data.url,
    expiresAt: data.expires_at,
  };
}

export default app;
