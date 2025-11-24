import { z } from "zod";

// FR-036 Secret audit record schema (spec alignment)
export const SecretAuditOriginSchema = z.enum(["user", "system"], {
  description: "Origin of the secret operation: user (manual) or system (automated rotation)"
});

export const SecretAuditOperationSchema = z.enum(["read", "update", "rotate"], {
  description: "Secret operation performed"
});

export const SecretAuditRecordSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid().optional(),
  origin: SecretAuditOriginSchema,
  secretRefHash: z.string().min(1),
  operation: SecretAuditOperationSchema,
  timestamp: z.string().datetime(),
}).strict().superRefine((val, ctx) => {
  if (val.origin === 'user' && !val.actorId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'actorId required when origin=user'
    });
  }
}); // disallow secretValue or other accidental leakage fields

export type SecretAuditRecord = z.infer<typeof SecretAuditRecordSchema>;

// Response schema for listing audit events (lightweight project/env scoping handled server-side)
export const SecretAuditListSchema = z.object({
  events: z.array(SecretAuditRecordSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export type SecretAuditList = z.infer<typeof SecretAuditListSchema>;