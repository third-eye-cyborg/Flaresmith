import { z } from "zod";

export const DeploymentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  environmentId: z.string().uuid(),
  commitSha: z.string().optional(),
  status: z.enum(["queued", "running", "successful", "failed"]).optional(),
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
}).partial();

export type Deployment = z.infer<typeof DeploymentSchema>;
