import { z } from "zod";

/**
 * T019: Additional type schemas for integrations and configurations
 */

// GitHub Integration Configuration
export const GitHubConfigSchema = z.object({
  enabled: z.boolean(),
  owner: z.string().optional(),
  repo: z.string().optional(),
  templateRepo: z.string().optional(),
  defaultBranch: z.string().default("main"),
  requiresCodespaces: z.boolean().default(false),
});

export type GitHubConfig = z.infer<typeof GitHubConfigSchema>;

// Cloudflare Integration Configuration
export const CloudflareConfigSchema = z.object({
  enabled: z.boolean(),
  accountId: z.string().optional(),
  workerName: z.string().optional(),
  pageProject: z.string().optional(),
  defaultZone: z.string().optional(),
});

export type CloudflareConfig = z.infer<typeof CloudflareConfigSchema>;

// Neon Integration Configuration
export const NeonConfigSchema = z.object({
  enabled: z.boolean(),
  projectId: z.string().optional(),
  parentBranch: z.string().default("main"),
  databaseName: z.string().optional(),
});

export type NeonConfig = z.infer<typeof NeonConfigSchema>;

// Postman Integration Configuration
export const PostmanConfigSchema = z.object({
  enabled: z.boolean(),
  workspaceId: z.string().optional(),
  collectionId: z.string().optional(),
  syncFromOpenAPI: z.boolean().default(true),
});

export type PostmanConfig = z.infer<typeof PostmanConfigSchema>;

// Aggregate Integrations Configuration
export const IntegrationsConfigSchema = z.object({
  github: GitHubConfigSchema.optional(),
  cloudflare: CloudflareConfigSchema.optional(),
  neon: NeonConfigSchema.optional(),
  postman: PostmanConfigSchema.optional(),
});

export type IntegrationsConfig = z.infer<typeof IntegrationsConfigSchema>;
