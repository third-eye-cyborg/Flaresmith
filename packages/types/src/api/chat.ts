import { z } from "zod";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.string().datetime(),
});

// WebSocket event envelopes (T097)
export const ChatClientEventSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("start"), projectId: z.string().uuid(), branch: z.string(), sessionId: z.string().uuid().optional() }),
  z.object({ kind: z.literal("message"), sessionId: z.string().uuid(), text: z.string().min(1) }),
  z.object({ kind: z.literal("apply-request"), sessionId: z.string().uuid(), baseCommitSha: z.string().length(40) }),
]);

export const ChatTokenChunkSchema = z.object({
  kind: z.literal("token"),
  token: z.string(),
});

export const ChatAssistantMessageSchema = z.object({
  kind: z.literal("message"),
  message: ChatMessageSchema,
});

export const ChatDiffSchema = z.object({
  kind: z.literal("diff"),
  diffs: z.array(
    z.object({
      path: z.string(),
      patch: z.string(), // unified diff text or patch representation
    })
  ),
});

export const ChatErrorSchema = z.object({ kind: z.literal("error"), code: z.string(), message: z.string() });
export const ChatCompleteSchema = z.object({ kind: z.literal("complete"), sessionId: z.string().uuid() });

export const ChatServerEventSchema = z.union([
  ChatTokenChunkSchema,
  ChatAssistantMessageSchema,
  ChatDiffSchema,
  ChatErrorSchema,
  ChatCompleteSchema,
]);

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
  owner: z.string().optional(),
  repo: z.string().optional(),
  branch: z.string().optional(),
});

export const ApplyDiffResponseSchema = z.object({
  commitSha: z.string().length(40),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatClientEvent = z.infer<typeof ChatClientEventSchema>;
export type ChatServerEvent = z.infer<typeof ChatServerEventSchema>;
export type ApplyDiffRequest = z.infer<typeof ApplyDiffRequestSchema>;
export type ApplyDiffResponse = z.infer<typeof ApplyDiffResponseSchema>;
