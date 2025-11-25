import { z } from "zod";

export const SpecDocumentSchema = z.object({ id: z.string().uuid(), featureKey: z.string(), version: z.string(), createdAt: z.string().datetime().optional() }).partial();
export type SpecDocument = z.infer<typeof SpecDocumentSchema>;
