import { z } from "zod";

/**
 * T005: Internal auth session entity schema
 * Mirrors Drizzle table 'sessions' for internal tooling & tests
 */
export const AuthSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  refreshTokenHash: z.string().min(10),
  accessExpiresAt: z.string().datetime(),
  refreshExpiresAt: z.string().datetime(),
  deviceInfo: z.record(z.any()).optional(),
  revokedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AuthSession = z.infer<typeof AuthSessionSchema>;
