/**
 * GET /design/tokens Route
 * 
 * Implements T022-T023: Retrieve design tokens with optional filtering
 * 
 * Requirements:
 * - FR-002: Single source of truth (database-backed)
 * - FR-019: Versioned token snapshots
 * - SC-007: API response time <100ms (performance target)
 * 
 * Query Parameters:
 * - category: Optional token category filter (color|spacing|typography|radius|elevation|glass|semantic)
 * - version: Optional version number (defaults to latest)
 * 
 * Response:
 * - version: Current token version number
 * - tokens: Array of DesignToken objects
 * 
 * Error Codes:
 * - DESIGN_TOKEN_NOT_FOUND: Requested version doesn't exist
 * - DESIGN_TOKEN_INVALID_CATEGORY: Invalid category parameter
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { tokenService } from '../../services/designSystem/tokenService';
import { DesignTokenCategory } from '@flaresmith/types';
import { randomUUID } from 'node:crypto';

const app = new Hono();

// Request validation schema
const GetTokensQuerySchema = z.object({
  category: z.enum(['color', 'spacing', 'typography', 'radius', 'elevation', 'glass', 'semantic']).optional(),
  version: z.coerce.number().int().positive().optional(),
});

/**
 * GET /design/tokens
 * 
 * Retrieve design tokens with optional category and version filtering
 * 
 * @example
 * GET /design/tokens
 * GET /design/tokens?category=color
 * GET /design/tokens?version=5
 * GET /design/tokens?category=semantic&version=5
 */
app.get('/', async (c) => {
  const startTime = performance.now();
  const requestId = randomUUID();

  try {
    // Validate query parameters
    const queryParams = GetTokensQuerySchema.safeParse(c.req.query());
    
    if (!queryParams.success) {
      return c.json({
        error: {
          code: 'DESIGN_TOKEN_INVALID_CATEGORY',
          message: 'Invalid query parameters',
          severity: 'error',
          retryPolicy: 'none',
          requestId: requestId,
          timestamp: new Date().toISOString(),
          context: { errors: queryParams.error.errors },
          hint: 'Valid categories: color, spacing, typography, radius, elevation, glass, semantic',
        },
      }, 400);
    }

    const { category, version } = queryParams.data;

    // Build options object
    const options: { category?: DesignTokenCategory; version?: number } = {};
    
    if (category) {
      options.category = category as DesignTokenCategory;
    }
    
    if (version !== undefined) {
      options.version = version;
    }

    // Fetch tokens
    const result = await tokenService.getTokens({ ...options, correlationId: requestId });

    const durationMs = performance.now() - startTime;

    // Log performance warning if exceeds target
    if (durationMs > 100) {
      console.warn(`[GET /design/tokens] Response time ${durationMs.toFixed(2)}ms exceeds 100ms target (SC-007)`, {
        requestId: requestId,
        category,
        version,
        tokenCount: result.tokens.length,
      });
    }

    return c.json({
      version: result.version,
      tokens: result.tokens,
      meta: {
        count: result.tokens.length,
        durationMs: Math.round(durationMs),
        requestId: requestId,
      },
    });
  } catch (error) {
    const durationMs = performance.now() - startTime;
    
    console.error('[GET /design/tokens] Error:', {
      error: error instanceof Error ? error.message : String(error),
      requestId: requestId,
      durationMs: Math.round(durationMs),
    });

    return c.json({
      error: {
        code: 'DESIGN_TOKEN_FETCH_FAILED',
        message: 'Failed to retrieve design tokens',
        severity: 'error',
        retryPolicy: 'exponential_backoff',
        requestId: requestId,
        timestamp: new Date().toISOString(),
        context: { durationMs: Math.round(durationMs) },
        hint: 'Check database connectivity and token service health',
      },
    }, 500);
  }
});

export default app;
