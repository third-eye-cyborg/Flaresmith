import { z } from "zod";

export const PaginationRequestSchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export const PaginationResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  });

export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;
export type PaginationResponse<T> = {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
};
