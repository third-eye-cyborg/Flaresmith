import { z } from "zod";

export const BuildStatusSchema = z.enum(["queued", "running", "succeeded", "failed"]);

export const BuildSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  environmentId: z.string().uuid(),
  commitSha: z.string().length(40),
  status: BuildStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Build = z.infer<typeof BuildSchema>;
export type BuildStatus = z.infer<typeof BuildStatusSchema>;
