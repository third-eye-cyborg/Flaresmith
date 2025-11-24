import { z } from 'zod';

/**
 * T004: Zod schemas for secret validation and conflict detection
 * Source: specs/002-github-secrets-sync/data-model.md
 */

// Secret validation request schema
export const SecretValidationRequestSchema = z.object({
  projectId: z.string().uuid(),
  requiredSecrets: z.array(z.string()).optional(),
});

// Secret validation response schema
export const SecretValidationResponseSchema = z.object({
  valid: z.boolean(),
  missing: z.array(z.object({
    secretName: z.string(),
    scope: z.string(),
  })),
  conflicts: z.array(z.object({
    secretName: z.string(),
    scopes: z.array(z.string()),
    valueHashes: z.record(z.string()),
  })),
  summary: z.object({
    totalSecrets: z.number().int().nonnegative(),
    missingCount: z.number().int().nonnegative(),
    conflictCount: z.number().int().nonnegative(),
    validCount: z.number().int().nonnegative(),
  }),
  remediationSteps: z.array(z.string()),
});

// Type exports
export type SecretValidationRequest = z.infer<typeof SecretValidationRequestSchema>;
export type SecretValidationResponse = z.infer<typeof SecretValidationResponseSchema>;
