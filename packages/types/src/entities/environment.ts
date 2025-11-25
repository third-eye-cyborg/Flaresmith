import { z } from "zod";

export const EnvironmentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.enum(["dev", "staging", "prod", "preview"]).describe("Canonical environment name"),
  state: z.string().describe("Lifecycle state"),
  createdAt: z.string().datetime().optional(),
}).partial();

export type Environment = z.infer<typeof EnvironmentSchema>;
