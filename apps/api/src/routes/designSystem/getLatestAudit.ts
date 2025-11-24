/**
 * GET /design/audits/latest
 * Feature: 004-design-system
 * Task: T067, T068
 * 
 * Retrieve latest accessibility audit report
 * Optional mode filter (light|dark)
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { GetLatestAuditResponse, ThemeMode } from '@flaresmith/types';
import { accessibilityAuditService } from '../../services/designSystem/accessibilityAuditService';
import { z } from 'zod';

const app = new Hono();

app.get(
  '/',
  zValidator(
    'query',
    z.object({
      mode: ThemeMode.optional(),
    })
  ),
  async (c) => {
    const { mode } = c.req.valid('query');

    // Retrieve latest audit from database
    const audit = await accessibilityAuditService.getLatestAudit(mode);

    if (!audit) {
      return c.json(
        {
          error: {
            code: 'DESIGN_AUDIT_NOT_FOUND',
            message: 'No accessibility audit found',
            severity: 'error',
          },
        },
        404
      );
    }

    // Format response
    const response = {
      id: audit.id,
      version: audit.version,
      mode: audit.mode,
      report: audit.report,
      passed_pct: audit.passedPct,
      created_at: audit.createdAt.toISOString(),
    };

    return c.json(GetLatestAuditResponse.parse(response));
  }
);

export default app;
