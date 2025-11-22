import { z } from "zod";

export const ProjectStatusSchema = z.enum(["provisioning", "active", "failed"]);

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(64),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  orgId: z.string().uuid(),
  defaultBranch: z.string().default("main"),
  status: ProjectStatusSchema.default("provisioning"),
  integrations: z
    .object({
      githubRepo: z.string().optional(),
      cloudflareAccountId: z.string().optional(),
      neonProjectId: z.string().optional(),
      postmanWorkspaceId: z.string().optional(),
    })
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
