import { z } from "zod";
import { EnvironmentSchema } from "../entities/environment";

export const GetEnvironmentsRequestSchema = z.object({
  projectId: z.string().uuid(),
});

export const GetEnvironmentsResponseSchema = z.array(EnvironmentSchema);

export type GetEnvironmentsRequest = z.infer<typeof GetEnvironmentsRequestSchema>;
export type GetEnvironmentsResponse = z.infer<typeof GetEnvironmentsResponseSchema>;
