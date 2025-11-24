import { z } from "zod";

/**
 * T038: User auth & session schemas (Better Auth + Polar context)
 */
export const UserSignupInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const OAuthProvider = z.enum(["google", "github", "microsoft"]);

export const UserSession = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  expiresAt: z.string(),
  polarCustomerId: z.string(),
  subscriptionTier: z.enum(["free", "pro", "enterprise"]),
  subscriptionStatus: z.enum(["active", "canceled", "past_due", "trialing"]),
});

export const TokenType = z.enum(["user", "admin"]);

export type UserSignupInput = z.infer<typeof UserSignupInput>;
export type UserSession = z.infer<typeof UserSession>;
export type OAuthProvider = z.infer<typeof OAuthProvider>;
