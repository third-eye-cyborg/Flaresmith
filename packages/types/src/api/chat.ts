import { z } from "zod";

export const ChatMessageSchema = z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() });
export const ChatSessionSchema = z.object({ id: z.string().uuid(), messages: z.array(ChatMessageSchema), createdAt: z.string().datetime().optional() }).partial();

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatSession = z.infer<typeof ChatSessionSchema>;
