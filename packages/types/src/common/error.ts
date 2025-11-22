import { z } from "zod";

export const ErrorSeveritySchema = z.enum(["info", "warn", "error", "critical"]);

export const RetryPolicySchema = z.enum(["none", "safe", "idempotent"]);

export const ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: ErrorSeveritySchema,
  retryPolicy: RetryPolicySchema,
  requestId: z.string(),
  timestamp: z.string().datetime(),
  context: z.record(z.unknown()).optional(),
  hint: z.string().optional(),
  causeChain: z.array(z.string()).optional(),
  details: z.record(z.unknown()).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorSchema>;
export type ErrorSeverity = z.infer<typeof ErrorSeveritySchema>;
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;
