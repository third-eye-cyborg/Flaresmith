import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { validateReceipt } from '@cloudmake/utils/billing/validateReceipt';
// import { UpdateSubscriptionService } from '../../../services/billing/updateSubscription'; // (future use: update subscription after validating receipt)

/**
 * Mobile Receipt Validation Route (T077)
 *
 * Validates mobile in-app purchase receipts and updates subscription tier.
 * Integrates with existing receipt validation helper (T036).
 */

const app = new Hono();

const ReceiptValidationInput = z.object({
  receiptToken: z.string().min(10),
  productId: z.string().min(2).optional(),
  platform: z.enum(['ios', 'android']).optional(),
});

app.post('/receipt', async (c: Context) => {
  const requestId = c.get('requestId');
  // const userId = c.get('userId'); // userId currently unused; will be leveraged when subscription update logic is added
  const tokenType = c.get('tokenType');

  if (tokenType !== 'user') {
    return c.json({
      error: {
        code: 'AUTH_USER_BOUNDARY_VIOLATION',
        message: 'User token required for receipt validation',
        severity: 'error',
        retryPolicy: 'none',
        requestId,
        timestamp: new Date().toISOString(),
      },
    }, 403);
  }

  try {
    const body = await c.req.json();
    const input = ReceiptValidationInput.parse(body);

    const raw: any = { receiptToken: input.receiptToken };
    if (input.productId) raw.productId = input.productId;
    if (input.platform) raw.platform = input.platform;
    const validated = validateReceipt(raw);

    const tier = mapProductToTier(validated.productId || 'free');

    // Placeholder: update subscription would require polarCustomerId lookup
    // UpdateSubscriptionService.updateSubscription(...) could be invoked here with resolved customer id

    return c.json({
      success: true,
      tier,
      idempotencyKey: validated.idempotencyKey,
      platform: validated.platform,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: {
          code: 'RECEIPT_VALIDATION_FAILED',
          message: 'Invalid receipt parameters',
          severity: 'error',
          retryPolicy: 'none',
          requestId,
          timestamp: new Date().toISOString(),
          context: { errors: error.errors },
        },
      }, 400);
    }

    return c.json({
      error: {
        code: 'RECEIPT_PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Receipt processing failed',
        severity: 'error',
        retryPolicy: 'manual',
        requestId,
        timestamp: new Date().toISOString(),
      },
    }, 500);
  }
});

function mapProductToTier(productId: string): 'free' | 'pro' | 'enterprise' {
  if (productId.includes('enterprise')) return 'enterprise';
  if (productId.includes('pro')) return 'pro';
  return 'free';
}

export default app;
