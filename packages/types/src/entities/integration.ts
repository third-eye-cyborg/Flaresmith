import { z } from "zod";

export const IntegrationSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  provider: z.enum(["github", "cloudflare", "neon", "postman", "design-system", "analytics"]).optional(),
  status: z.enum(["pending", "active", "error"]).optional(),
}).partial();

export type Integration = z.infer<typeof IntegrationSchema>;
