import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  SecretValidationRequestSchema,
  SecretValidationResponseSchema,
  type SecretValidationRequest,
  type SecretValidationResponse,
} from '@flaresmith/types';
import { createGitHubClient } from '../../integrations/github/client';
import { SecretValidationService } from '../../services/github/secretValidationService';
import { db } from '../../../db/connection';
import { v4 as uuidv4 } from 'uuid';

/**
 * T050-T052: POST /github/secrets/validate
 * Validates secret presence and conflicts across scopes with 5-minute caching
 */

const app = new Hono();

// Simple in-memory cache (per worker instance)
const validationCache: Map<string, { timestamp: number; result: SecretValidationResponse }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

app.post('/', zValidator('json', SecretValidationRequestSchema), async (c: any) => {
  // Start time reserved for future metrics (duration tracking)
  const correlationId = uuidv4();

  try {
    const user = c.get('user');
    if (!user) {
      return c.json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          severity: 'error',
          retryPolicy: 'none',
          requestId: correlationId,
          timestamp: new Date().toISOString(),
        },
      }, 401);
    }

    const request = c.req.valid('json') as SecretValidationRequest;
    const { projectId } = request;

    // T052: Cache lookup
    const cacheKey = `${projectId}-${(request.requiredSecrets || []).join(',')}`;
    const cached = validationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return c.json(cached.result, 200);
    }

    // Initialize GitHub client (token for potential future scope reads)
    const githubToken = (c.env as any).GITHUB_TOKEN || process.env.GITHUB_TOKEN;
    const octokit = createGitHubClient(githubToken).getOctokit();

    const service = new SecretValidationService(octokit, db);

    // T051: Perform validation
    const result = await service.validateSecrets({
      projectId,
      requiredSecrets: request.requiredSecrets || undefined,
      actorId: user.id,
      correlationId,
    });

    const response: SecretValidationResponse = {
      valid: result.valid,
      missing: result.missing,
      conflicts: result.conflicts,
      summary: result.summary,
      remediationSteps: result.remediationSteps,
    };

    // Schema validation before caching/return
    const validated = SecretValidationResponseSchema.parse(response);
    validationCache.set(cacheKey, { timestamp: Date.now(), result: validated });

    return c.json(validated, result.valid ? 200 : 207);
  } catch (error: any) {
    return c.json({
      error: {
        code: 'GITHUB_SECRETS_VALIDATION_FAILED',
        message: error.message || 'Secret validation failed',
        severity: 'error',
        retryPolicy: 'safe',
        requestId: correlationId,
        timestamp: new Date().toISOString(),
      },
    }, 500);
  } finally {
    // Optional: metrics emission
  }
});

export default app;
