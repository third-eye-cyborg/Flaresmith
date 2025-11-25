import { z } from "zod";

export const IdentityProviderLinkSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  provider: z.string(),
  subject: z.string(),
  createdAt: z.string().datetime().optional(),
}).partial();

export type IdentityProviderLink = z.infer<typeof IdentityProviderLinkSchema>;
