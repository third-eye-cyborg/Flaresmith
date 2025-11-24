import { z } from "zod";

/**
 * T040: MCP Tool Invocation schemas
 */
export const ActorType = z.enum(["admin", "user", "system"]);

export const MCPToolInvocation = z.object({
  id: z.string().uuid(),
  toolName: z.string(),
  serverName: z.string(),
  actorType: ActorType,
  actorId: z.string().uuid().nullable().optional(),
  durationMs: z.number().int().nonnegative(),
  success: z.boolean(),
  errorCode: z.string().optional(),
  correlationId: z.string().uuid(),
  timestamp: z.string().optional(),
  resourceRef: z.string().optional(),
  rateLimitApplied: z.boolean().optional(),
});

export type MCPToolInvocation = z.infer<typeof MCPToolInvocation>;
