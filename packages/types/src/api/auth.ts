import { z } from "zod";

// Requests
export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const RefreshRequestSchema = z.object({
  refreshToken: z.string(),
});

export const OAuthCallbackQuerySchema = z.object({
  state: z.string(),
  code: z.string(),
  provider: z.enum(["apple", "google", "github"]),
});

// Entities (subset for responses)
export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable().optional(),
  displayName: z.string().optional(),
});

// Responses
export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  accessExpiresAt: z.string().datetime(),
  refreshToken: z.string(),
  refreshExpiresAt: z.string().datetime(),
  user: AuthUserSchema,
});

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  accessExpiresAt: z.string().datetime(),
  refreshToken: z.string(),
  refreshExpiresAt: z.string().datetime(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuerySchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
