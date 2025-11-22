import { z } from "zod";

export const DeploymentStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "rolledback",
]);

export const DeploymentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  environmentId: z.string().uuid(),
  sourceCommitSha: z.string().length(40),
  providerIds: z
    .object({
      cloudflareDeploymentId: z.string().optional(),
      githubRunId: z.string().optional(),
    })
    .optional(),
  status: DeploymentStatusSchema,
  preview: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Deployment = z.infer<typeof DeploymentSchema>;
export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>;
