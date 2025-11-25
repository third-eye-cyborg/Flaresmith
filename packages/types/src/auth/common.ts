import { z } from "zod";

// Generic user login request
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Registration (signup) request (spec placeholder - extend per FR when defined)
export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

// OAuth callback query params (authorization code flow)
export const OAuthCallbackQuerySchema = z.object({
  provider: z.enum(["github", "google", "microsoft"]).describe("OAuth provider"),
  code: z.string().min(1),
  state: z.string().min(1).optional(),
});

// Auth response envelope (access + refresh tokens)
export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int(),
  user: z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
      subscriptionTier: z.enum(["free", "pro", "enterprise"]).optional(),
    })
    .optional(),
});

export const RefreshRequestSchema = z.object({ refreshToken: z.string() });
export const RefreshResponseSchema = AuthResponseSchema.pick({ accessToken: true, refreshToken: true, expiresIn: true });

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuerySchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
