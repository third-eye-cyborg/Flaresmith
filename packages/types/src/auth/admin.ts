import { z } from "zod";

/**
 * T037: Admin auth & session schemas (Neon Auth)
 */
export const AdminLoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  mfaCode: z.string().length(6).optional(),
});

export const AdminSession = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  expiresAt: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const AdminAuditAction = z.object({
  actionType: z.string(),
  entityType: z.string(),
  entityId: z.string().optional(),
  changes: z.record(z.any()).optional(),
});

export const AdminRole = z.enum(["admin"]);

export const AdminLoginOutput = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  mfaRequired: z.boolean().optional(),
  mfaToken: z.string().optional(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.string(),
  }).optional(),
  correlationId: z.string().uuid(),
});

export type AdminLoginInput = z.infer<typeof AdminLoginInput>;
export type AdminLoginOutput = z.infer<typeof AdminLoginOutput>;
export type AdminSession = z.infer<typeof AdminSession>;
export type AdminAuditAction = z.infer<typeof AdminAuditAction>;
