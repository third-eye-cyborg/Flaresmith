import { z } from "zod";

export const SecretValidationResultSchema = z.object({ missing: z.array(z.string()), conflicts: z.array(z.object({ name: z.string(), scopes: z.array(z.string()) })), remediation: z.array(z.string()) });
export type SecretValidationResult = z.infer<typeof SecretValidationResultSchema>;
