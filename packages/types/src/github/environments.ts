import { z } from 'zod';

/**
 * T003: Zod schemas for GitHub environment configuration
 * Source: specs/002-github-secrets-sync/data-model.md
 */

// Environment configuration schema
export const EnvironmentConfigSchema = z.object({
  name: z.enum(['dev', 'staging', 'production']),
  protectionRules: z.object({
    requiredReviewers: z.number().int().nonnegative().optional().default(0),
    reviewerIds: z.array(z.number().int()).optional(),
    restrictToMainBranch: z.boolean().optional().default(false),
    waitTimer: z.number().int().nonnegative().optional().default(0),
  }),
  secrets: z.array(z.object({
    name: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    value: z.string(),
  })),
  linkedResources: z.object({
    neonBranchId: z.string().optional(),
    cloudflareWorkerName: z.string().optional(),
    cloudflarePagesProject: z.string().optional(),
  }),
});

// Create environments request schema
export const CreateEnvironmentsRequestSchema = z.object({
  projectId: z.string().uuid(),
  environments: z.array(EnvironmentConfigSchema),
});

// Create environments response schema
export const CreateEnvironmentsResponseSchema = z.object({
  created: z.array(z.string()),
  updated: z.array(z.string()),
  errors: z.array(z.object({
    environment: z.string(),
    error: z.string(),
    code: z.string(),
  })),
  correlationId: z.string().uuid(),
});

// Type exports
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
export type CreateEnvironmentsRequest = z.infer<typeof CreateEnvironmentsRequestSchema>;
export type CreateEnvironmentsResponse = z.infer<typeof CreateEnvironmentsResponseSchema>;
