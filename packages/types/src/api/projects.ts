import { z } from "zod";
import { ProjectSchema } from "../entities/project";

export const CreateProjectRequestSchema = z.object({
  name: z.string().min(3).max(64),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  orgId: z.string().uuid(),
  integrations: z
    .object({
      github: z.boolean().default(false),
      cloudflare: z.boolean().default(false),
      neon: z.boolean().default(false),
      postman: z.boolean().default(false),
      codespaces: z.boolean().default(false),
    })
    .optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateProjectResponseSchema = ProjectSchema;

export const GetProjectRequestSchema = z.object({
  id: z.string().uuid(),
});

export const GetProjectResponseSchema = ProjectSchema;

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type CreateProjectResponse = z.infer<typeof CreateProjectResponseSchema>;
export type GetProjectRequest = z.infer<typeof GetProjectRequestSchema>;
export type GetProjectResponse = z.infer<typeof GetProjectResponseSchema>;
