import { z } from "zod";

export const ListProjectsRequestSchema = z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(50).optional() }).partial();
export const ProjectListItemSchema = z.object({ id: z.string().uuid(), name: z.string() }).partial();
export const ListProjectsResponseSchema = z.object({ items: z.array(ProjectListItemSchema), nextCursor: z.string().nullable().optional() });

export type ListProjectsRequest = z.infer<typeof ListProjectsRequestSchema>;
export type ListProjectsResponse = z.infer<typeof ListProjectsResponseSchema>;
