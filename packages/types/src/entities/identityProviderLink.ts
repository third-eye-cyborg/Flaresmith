import { z } from "zod";

/**
 * T005: Internal identity provider link entity schema
 * Mirrors Drizzle table 'identity_provider_links'
 */
export const IdentityProviderEnumSchema = z.enum(["apple", "google", "github", "password"]);

export const IdentityProviderLinkSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  provider: IdentityProviderEnumSchema,
  subject: z.string().min(1),
  emailAtProvider: z.string().email().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type IdentityProviderLink = z.infer<typeof IdentityProviderLinkSchema>;
