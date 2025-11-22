import { z } from "zod";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.string().datetime(),
});

export const ApplyDiffRequestSchema = z.object({
  sessionId: z.string().uuid(),
  diffs: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
    })
  ),
  baseCommitSha: z.string().length(40),
  message: z.string(),
});

export const ApplyDiffResponseSchema = z.object({
  commitSha: z.string().length(40),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ApplyDiffRequest = z.infer<typeof ApplyDiffRequestSchema>;
export type ApplyDiffResponse = z.infer<typeof ApplyDiffResponseSchema>;
