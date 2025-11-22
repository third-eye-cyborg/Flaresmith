import { z } from "zod";

export const GetEnvironmentsRequestSchema = z.object({
  projectId: z.string().uuid(),
});

// Extended environment status with integration details
export const EnvironmentStatusSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  kind: z.enum(["core", "preview"]),
  githubBranch: z.string(),
  cloudflareUrl: z.string().url().optional(),
  neonBranchId: z.string().optional(),
  postmanEnvironmentId: z.string().optional(),
  lastDeploymentId: z.string().uuid().optional(),
  ttlExpiresAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  
  // Integration status
  github: z.object({
    branch: z.string(),
    lastCommitSha: z.string().optional(),
    lastCommitMessage: z.string().optional(),
    lastCommitAt: z.string().datetime().optional(),
    status: z.enum(["active", "stale", "error"]),
  }).optional(),
  
  cloudflare: z.object({
    deploymentId: z.string().optional(),
    url: z.string().url().optional(),
    status: z.enum(["deployed", "deploying", "failed", "none"]),
    lastDeployedAt: z.string().datetime().optional(),
  }).optional(),
  
  neon: z.object({
    branchId: z.string().optional(),
    status: z.enum(["active", "creating", "error", "none"]),
    computeStatus: z.enum(["active", "idle", "suspended"]).optional(),
  }).optional(),
  
  postman: z.object({
    environmentId: z.string().optional(),
    status: z.enum(["synced", "outdated", "error", "none"]),
    lastSyncedAt: z.string().datetime().optional(),
  }).optional(),
  
  // Last deployment info
  lastDeployment: z.object({
    id: z.string().uuid(),
    status: z.enum(["queued", "running", "succeeded", "failed", "rolledback"]),
    commitSha: z.string(),
    createdAt: z.string().datetime(),
  }).optional(),
  
  // Last build info
  lastBuild: z.object({
    id: z.string().uuid(),
    status: z.enum(["queued", "running", "succeeded", "failed"]),
    commitSha: z.string(),
    createdAt: z.string().datetime(),
  }).optional(),
});

export const GetEnvironmentsResponseSchema = z.object({
  environments: z.array(EnvironmentStatusSchema),
});

export type GetEnvironmentsRequest = z.infer<typeof GetEnvironmentsRequestSchema>;
export type GetEnvironmentsResponse = z.infer<typeof GetEnvironmentsResponseSchema>;
export type EnvironmentStatus = z.infer<typeof EnvironmentStatusSchema>;
