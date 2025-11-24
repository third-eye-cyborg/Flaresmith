/**
 * GET /design/drift
 * Feature: 004-design-system
 * Task: T070, T071
 * 
 * Detect drift between baseline token specification and current implementation
 * Used by CI to block merges when tokens diverge from spec
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { DetectDriftResponse } from '@flaresmith/types';
import { driftDetectionService } from '../../services/designSystem/driftDetectionService';
import { z } from 'zod';

const app = new Hono();

app.get(
  '/',
  zValidator(
    'query',
    z.object({
      baselineVersion: z.coerce.number().int().positive().optional(),
    })
  ),
  async (c) => {
    const { baselineVersion } = c.req.valid('query');

    // Detect drift
    const result = await driftDetectionService.detectDrift(baselineVersion);

    return c.json(DetectDriftResponse.parse(result));
  }
);

export default app;
