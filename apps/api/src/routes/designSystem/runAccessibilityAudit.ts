/**
 * POST /design/audits/run
 * Feature: 004-design-system
 * Task: T065, T066
 * 
 * Trigger accessibility audit for design tokens
 * Returns auditId immediately, audit runs asynchronously
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { RunAccessibilityAuditRequest, RunAccessibilityAuditResponse } from '@flaresmith/types';
import { accessibilityAuditService } from '../../services/designSystem/accessibilityAuditService';

const app = new Hono();

app.post(
  '/',
  zValidator('json', RunAccessibilityAuditRequest),
  async (c) => {
    const { mode, focusComponents } = c.req.valid('json');

    // Trigger async audit job
    const result = await accessibilityAuditService.runAudit({
      mode,
      focusComponents,
    });

    // Return 202 Accepted with auditId
    return c.json(
      RunAccessibilityAuditResponse.parse(result),
      202
    );
  }
);

export default app;
