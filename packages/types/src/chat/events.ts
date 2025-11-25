import { z } from "zod";

export const ChatClientEventSchema = z.object({
  type: z.enum(["message", "status", "commit", "error"]),
  sessionId: z.string().uuid().optional(),
  payload: z.record(z.unknown()).optional(),
});

export type ChatClientEvent = z.infer<typeof ChatClientEventSchema>;
