import { z } from "zod";

export const BuildSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  artifactId: z.string().optional(),
  status: z.enum(["pending", "running", "completed", "failed"]).optional(),
  createdAt: z.string().datetime().optional(),
}).partial();

export type Build = z.infer<typeof BuildSchema>;
