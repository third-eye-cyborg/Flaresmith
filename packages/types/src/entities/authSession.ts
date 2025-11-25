import { z } from "zod";

export const AuthSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional(),
}).partial();

export type AuthSession = z.infer<typeof AuthSessionSchema>;
