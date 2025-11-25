import { z } from "zod";

export const ProvisionEnvironmentsSchema = z.object({
  projectId: z.string().uuid(),
  environments: z.array(z.object({ name: z.string(), reviewers: z.array(z.string()).optional() })),
});
export const ProvisionEnvironmentsResultSchema = z.object({ created: z.array(z.string()), updated: z.array(z.string()), conflicts: z.array(z.string()).optional() });

export type ProvisionEnvironmentsInput = z.infer<typeof ProvisionEnvironmentsSchema>;
export type ProvisionEnvironmentsResult = z.infer<typeof ProvisionEnvironmentsResultSchema>;
