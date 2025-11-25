import { z } from "zod";

// Placeholder Project schema (spec-first stub). Replace with detailed fields per feature spec FR references.
export const ProjectSchema = z.object({
  id: z.string().uuid().describe("Project UUID"),
  name: z.string().min(1).describe("Human readable project name"),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
}).partial();

export type Project = z.infer<typeof ProjectSchema>;
