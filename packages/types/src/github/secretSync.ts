import { z } from 'zod';

/**
 * T002: Zod schemas for secret synchronization operations
 * Source: specs/002-github-secrets-sync/data-model.md
 */

// Secret sync request schema
export const SecretSyncRequestSchema = z.object({
  projectId: z.string().uuid(),
  secretNames: z.array(z.string().regex(/^[A-Z][A-Z0-9_]*$/)).optional(),
  targetScopes: z.array(z.enum(['codespaces', 'dependabot'])).optional(),
  force: z.boolean().optional().default(false),
});

// Secret sync response schema
export const SecretSyncResponseSchema = z.object({
  syncedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  errors: z.array(z.object({
    secretName: z.string(),
    scope: z.string(),
    error: z.string(),
    code: z.string(),
  })),
  correlationId: z.string().uuid(),
  durationMs: z.number().int().nonnegative(),
});

// Secret sync status response schema
export const SecretSyncStatusResponseSchema = z.object({
  lastSyncAt: z.string().datetime().nullable(),
  status: z.enum(['synced', 'pending', 'error', 'never_synced']),
  pendingCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  nextScheduledSyncAt: z.string().datetime().nullable(),
  quotaRemaining: z.object({
    core: z.number().int().nonnegative(),
    secrets: z.number().int().nonnegative(),
  }),
});

// Type exports
export type SecretSyncRequest = z.infer<typeof SecretSyncRequestSchema>;
export type SecretSyncResponse = z.infer<typeof SecretSyncResponseSchema>;
export type SecretSyncStatusResponse = z.infer<typeof SecretSyncStatusResponseSchema>;
