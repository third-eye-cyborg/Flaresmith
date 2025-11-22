import { z } from "zod";

export const UserRoleSchema = z.enum(["admin", "developer", "viewer"]);

export const UserSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1).max(64).optional(),
  roles: z.array(UserRoleSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(64),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
