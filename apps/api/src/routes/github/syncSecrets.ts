/**
 * T023-T025: POST /github/secrets/sync route
 * Handles secret synchronization with request validation, error handling, and rate limiting
 */

import { Hono } from 'hono';
import { SecretSyncRequestSchema, SecretSyncResponseSchema } from '@flaresmith/types';
import { SecretSyncService } from '../../services/github/secretSyncService';
import { createGitHubClient } from '../../integrations/github/client';
import { getDb } from '../../../db/connection';

const app = new Hono();

/**
 * POST /github/secrets/sync
 * 
 * Synchronize repository secrets across Actions, Codespaces, Dependabot scopes
 * and optionally to Cloudflare Workers/Pages
 * 
 * Request Body:
 * {
 *   projectId: string (UUID),
 *   secretNames?: string[] (optional - defaults to all),
 *   targetScopes?: Array<'codespaces' | 'dependabot'> (optional - defaults to both),
 *   force?: boolean (optional - overwrite conflicts, defaults to false)
 * }
 * 
 * Response:
 * {
 *   syncedCount: number,
 *   skippedCount: number,
 *   errors: Array<{ secretName, scope, error, code }>,
 *   correlationId: string (UUID),
 *   durationMs: number
 * }
 * 
 * Error Codes:
 * - GITHUB_SECRETS_RATE_LIMIT_EXHAUSTED: GitHub API rate limit reached
 * - GITHUB_SECRETS_SYNC_FAILED: General sync failure
 * - GITHUB_SECRETS_ENCRYPTION_FAILED: Secret encryption failure
 * - GITHUB_SECRETS_INVALID_PROJECT: Project not found or unauthorized
 */
app.post('/', async (c) => {
  const startTime = Date.now();

  try {
    // T023: Validate request using Zod schema
    const body = await c.req.json();
    const validationResult = SecretSyncRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            errors: validationResult.error.errors,
          },
        },
        400
      );
    }

    const { projectId, force } = validationResult.data;

    // Get authenticated user from context (assumes auth middleware sets c.var.user)
    const user = c.get('user') as any;
    if (!user || !user.id) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        401
      );
    }

    // T025: Check project ownership/access (assumes c.var.db and projects query)
    const env = c.env as any;
    const db = getDb(env?.DATABASE_URL || '');
    
    // TODO: Verify user has access to project
    // const hasAccess = await verifyProjectAccess(db, projectId, user.id);
    // if (!hasAccess) {
    //   return c.json({
    //     error: {
    //       code: 'GITHUB_SECRETS_INVALID_PROJECT',
    //       message: 'Project not found or unauthorized',
    //     }
    //   }, 403);
    // }

    // T024: Initialize GitHub client and secret sync service
    const githubToken = env?.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return c.json(
        {
          error: {
            code: 'GITHUB_SECRETS_CONFIG_ERROR',
            message: 'GitHub token not configured',
          },
        },
        500
      );
    }

    const githubClient = createGitHubClient(githubToken);
    const cloudflareApiToken = env?.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
    
    const secretSyncService = new SecretSyncService(
      githubClient.getOctokit(),
      db,
      cloudflareApiToken
    );

    // T024: Fetch project details to get owner/repo
    // TODO: Query project from database to get GitHub owner/repo
    // For now, using placeholder values
    const owner = 'placeholder-owner';
    const repo = 'placeholder-repo';

    // T024: Execute sync operation
    const syncResult = await secretSyncService.syncAllSecrets({
      projectId,
      owner,
      repo,
      actorId: user.id,
      force,
    });

    // T024: Build response matching SecretSyncResponseSchema
    const response = {
      syncedCount: syncResult.syncedCount,
      skippedCount: syncResult.skippedCount,
      errors: syncResult.results
        .filter(r => r.status === 'failed')
        .flatMap(r =>
          r.failedScopes.map(fs => ({
            secretName: r.secretName,
            scope: fs.scope,
            error: fs.error,
            code: 'GITHUB_SECRETS_SYNC_FAILED',
          }))
        ),
      correlationId: syncResult.correlationId,
      durationMs: Date.now() - startTime,
    };

    // Validate response schema
    const responseValidation = SecretSyncResponseSchema.safeParse(response);
    if (!responseValidation.success) {
      console.error('Response validation failed:', responseValidation.error);
      return c.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Response validation failed',
          },
        },
        500
      );
    }

    return c.json(responseValidation.data, 200);

  } catch (error: any) {
    // T025: Error handling for rate limits, encryption failures, partial failures
    
    // Check for rate limit errors
    if (error.message?.includes('rate limit') || error.status === 429) {
      return c.json(
        {
          error: {
            code: 'GITHUB_SECRETS_RATE_LIMIT_EXHAUSTED',
            message: 'GitHub API rate limit exceeded. Please retry after reset time.',
            retryAfter: error.response?.headers?.['x-ratelimit-reset'],
          },
        },
        429
      );
    }

    // Check for encryption failures
    if (error.message?.includes('encryption') || error.message?.includes('public key')) {
      return c.json(
        {
          error: {
            code: 'GITHUB_SECRETS_ENCRYPTION_FAILED',
            message: 'Failed to encrypt secret values',
            details: error.message,
          },
        },
        500
      );
    }

    // Generic sync failure
    console.error('Secret sync failed:', error);
    return c.json(
      {
        error: {
          code: 'GITHUB_SECRETS_SYNC_FAILED',
          message: 'Secret synchronization failed',
          details: error.message,
        },
      },
      500
    );
  }
});

export default app;
