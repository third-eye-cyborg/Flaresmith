import { z } from "zod";

/**
 * PostHog MCP Tool Input/Output Schemas
 * 
 * These schemas define the structure for PostHog MCP server operations
 * following the spec-first approach and Zod validation pattern.
 */

// Organization Management
export const CreateOrganizationInput = z.object({
  name: z.string().min(1).max(255).describe("Organization name"),
  slug: z.string().min(1).max(255).optional().describe("Organization URL slug (auto-generated if not provided)"),
});

export const CreateOrganizationOutput = z.object({
  id: z.string().describe("Organization UUID"),
  name: z.string(),
  slug: z.string(),
  created_at: z.string().datetime(),
  members_count: z.number().int().nonnegative(),
});

// Project Management
export const CreateProjectInput = z.object({
  organization_id: z.string().uuid().describe("Organization UUID"),
  name: z.string().min(1).max(255).describe("Project name"),
  timezone: z.string().default("UTC").describe("Project timezone (IANA format)"),
  recording_domains: z.array(z.string()).optional().describe("Allowed domains for session recording"),
});

export const CreateProjectOutput = z.object({
  id: z.number().int().positive().describe("Project ID"),
  uuid: z.string().uuid().describe("Project UUID"),
  name: z.string(),
  organization_id: z.string().uuid(),
  api_token: z.string().describe("Project API token for client-side tracking"),
  timezone: z.string(),
  created_at: z.string().datetime(),
});

export const GetProjectsInput = z.object({
  organization_id: z.string().uuid().describe("Organization UUID"),
});

export const ProjectSummary = z.object({
  id: z.number().int().positive(),
  uuid: z.string().uuid(),
  name: z.string(),
  organization_id: z.string().uuid(),
  created_at: z.string().datetime(),
});

export const GetProjectsOutput = z.object({
  projects: z.array(ProjectSummary),
  count: z.number().int().nonnegative(),
});

// Feature Flags
export const CreateFeatureFlagInput = z.object({
  project_id: z.number().int().positive().describe("Project ID"),
  key: z.string().min(1).max(400).describe("Unique feature flag key"),
  name: z.string().min(1).max(400).describe("Feature flag display name"),
  active: z.boolean().default(true).describe("Whether the flag is active"),
  filters: z.object({
    groups: z.array(z.object({
      properties: z.array(z.any()).optional(),
      rollout_percentage: z.number().min(0).max(100).optional(),
    })),
  }).optional().describe("Targeting and rollout rules"),
});

export const FeatureFlagOutput = z.object({
  id: z.number().int().positive(),
  key: z.string(),
  name: z.string(),
  active: z.boolean(),
  filters: z.object({
    groups: z.array(z.any()),
  }),
  created_at: z.string().datetime(),
});

export const CreateFeatureFlagOutput = FeatureFlagOutput;

export const GetFeatureFlagsInput = z.object({
  project_id: z.number().int().positive().describe("Project ID"),
  limit: z.number().int().positive().max(100).default(20).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
});

export const GetFeatureFlagsOutput = z.object({
  results: z.array(FeatureFlagOutput),
  count: z.number().int().nonnegative(),
  next: z.string().url().nullable(),
  previous: z.string().url().nullable(),
});

// Event Capture
export const CaptureEventInput = z.object({
  project_id: z.number().int().positive().describe("Project ID"),
  api_token: z.string().describe("Project API token"),
  event: z.string().min(1).describe("Event name"),
  distinct_id: z.string().min(1).describe("User/session identifier"),
  properties: z.record(z.any()).optional().describe("Event properties"),
  timestamp: z.string().datetime().optional().describe("Event timestamp (ISO 8601)"),
});

export const CaptureEventOutput = z.object({
  status: z.literal("success"),
  message: z.string().optional(),
});

// User Identification
export const IdentifyUserInput = z.object({
  project_id: z.number().int().positive().describe("Project ID"),
  api_token: z.string().describe("Project API token"),
  distinct_id: z.string().min(1).describe("User identifier"),
  properties: z.record(z.any()).describe("User properties to set/update"),
});

export const IdentifyUserOutput = z.object({
  status: z.literal("success"),
  message: z.string().optional(),
});

// Insights
export const GetInsightsInput = z.object({
  project_id: z.number().int().positive().describe("Project ID"),
  limit: z.number().int().positive().max(100).default(20).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
});

export const InsightSummary = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().optional(),
  filters: z.record(z.any()),
  created_at: z.string().datetime(),
  created_by: z.object({
    id: z.number().int(),
    email: z.string().email(),
  }).nullable(),
});

export const GetInsightsOutput = z.object({
  results: z.array(InsightSummary),
  count: z.number().int().nonnegative(),
  next: z.string().url().nullable(),
  previous: z.string().url().nullable(),
});

// Dashboard Management
export const CreateDashboardInput = z.object({
  project_id: z.number().int().positive().describe("Project ID"),
  name: z.string().min(1).max(400).describe("Dashboard name"),
  description: z.string().max(1000).optional().describe("Dashboard description"),
  tags: z.array(z.string()).optional().describe("Dashboard tags"),
  pinned: z.boolean().default(false).describe("Whether dashboard is pinned"),
});

export const DashboardOutput = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  description: z.string().optional(),
  pinned: z.boolean(),
  created_at: z.string().datetime(),
  created_by: z.object({
    id: z.number().int(),
    email: z.string().email(),
  }).nullable(),
  tags: z.array(z.string()),
});

export const CreateDashboardOutput = DashboardOutput;

// Export inferred TypeScript types
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationInput>;
export type CreateOrganizationOutput = z.infer<typeof CreateOrganizationOutput>;
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;
export type CreateProjectOutput = z.infer<typeof CreateProjectOutput>;
export type GetProjectsInput = z.infer<typeof GetProjectsInput>;
export type GetProjectsOutput = z.infer<typeof GetProjectsOutput>;
export type CreateFeatureFlagInput = z.infer<typeof CreateFeatureFlagInput>;
export type CreateFeatureFlagOutput = z.infer<typeof CreateFeatureFlagOutput>;
export type GetFeatureFlagsInput = z.infer<typeof GetFeatureFlagsInput>;
export type GetFeatureFlagsOutput = z.infer<typeof GetFeatureFlagsOutput>;
export type CaptureEventInput = z.infer<typeof CaptureEventInput>;
export type CaptureEventOutput = z.infer<typeof CaptureEventOutput>;
export type IdentifyUserInput = z.infer<typeof IdentifyUserInput>;
export type IdentifyUserOutput = z.infer<typeof IdentifyUserOutput>;
export type GetInsightsInput = z.infer<typeof GetInsightsInput>;
export type GetInsightsOutput = z.infer<typeof GetInsightsOutput>;
export type CreateDashboardInput = z.infer<typeof CreateDashboardInput>;
export type CreateDashboardOutput = z.infer<typeof CreateDashboardOutput>;
