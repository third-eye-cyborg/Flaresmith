import { z } from "zod";

export const EnvironmentKindSchema = z.enum(["core", "preview"]);

export const EnvironmentNameSchema = z.union([
  z.enum(["dev", "staging", "prod"]),
  z.string().regex(/^preview-[a-z0-9-]+$/),
]);

export const EnvironmentSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: EnvironmentNameSchema,
  kind: EnvironmentKindSchema,
  githubBranch: z.string(),
  cloudflareUrl: z.string().url().optional(),
  neonBranchId: z.string().optional(),
  postmanEnvironmentId: z.string().optional(),
  lastDeploymentId: z.string().uuid().optional(),
  ttlExpiresAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Environment = z.infer<typeof EnvironmentSchema>;
export type EnvironmentKind = z.infer<typeof EnvironmentKindSchema>;
