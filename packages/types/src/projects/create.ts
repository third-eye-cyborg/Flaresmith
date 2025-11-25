import { z } from "zod";

export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9\-]+$/),
  orgId: z.string().min(1),
  integrations: z
    .object({
      github: z.boolean().optional(),
      cloudflare: z.boolean().optional(),
      neon: z.boolean().optional(),
      postman: z.boolean().optional(),
      codespaces: z.boolean().optional(),
    })
    .optional(),
});

export const CreateProjectResponseSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  status: z.string(),
  integrations: z.record(z.unknown()).optional(),
});

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type CreateProjectResponse = z.infer<typeof CreateProjectResponseSchema>;
