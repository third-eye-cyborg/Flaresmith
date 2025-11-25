import { z } from "zod";

export const AuthProviderSchema = z.enum(["password", "github", "google", "oidc"]);

export const UserAuthSchema = z.object({
  userId: z.string().uuid(),
  provider: AuthProviderSchema,
  subject: z.string().describe("Provider subject / external user id"),
  createdAt: z.string().datetime().optional(),
}).partial();

export type UserAuth = z.infer<typeof UserAuthSchema>;
