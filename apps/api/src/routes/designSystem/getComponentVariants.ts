/**
 * GET /design/components/variants
 * Implements T043: List registered component variants
 */
import { Hono } from 'hono';
import { componentVariantService } from '../../services/designSystem/componentVariantService';
import { randomUUID } from 'node:crypto';

const app = new Hono();

app.get('/', async (c) => {
  const requestId = randomUUID();
  try {
    const variants = await componentVariantService.getVariants();
    return c.json({
      variants: variants.map(v => ({
        id: v.id,
        component: v.component,
        variant: v.variant,
        tokens_used: v.tokensUsed as string[],
        accessibility_status: v.accessibilityStatus,
        created_at: v.createdAt.toISOString(),
      })),
      count: variants.length,
      meta: { requestId }
    });
  } catch (error) {
    return c.json({
      error: {
        code: 'DESIGN_COMPONENT_VARIANTS_FETCH_FAILED',
        message: 'Failed to load component variants',
        severity: 'error',
        retryPolicy: 'exponential_backoff',
        requestId,
        timestamp: new Date().toISOString(),
        context: { error: error instanceof Error ? error.message : String(error) },
      }
    }, 500);
  }
});

export default app;
