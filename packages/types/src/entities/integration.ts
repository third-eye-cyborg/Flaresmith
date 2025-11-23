import { z } from "zod";

export const IntegrationProviderSchema = z.enum([
  "github",
  "cloudflare",
  "neon",
  "postman",
  "codespaces",
]);

export const IntegrationConfigSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  provider: IntegrationProviderSchema,
  config: z.record(z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;
export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>;
