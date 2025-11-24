// T016: Zod schemas for browser MCP test sessions
import { z } from 'zod';

export const BrowserSessionStatus = z.enum(['running','passed','failed','aborted']);

export const BrowserSessionStartRequest = z.object({
  storyId: z.string().uuid(),
  correlationId: z.string().uuid(),
});

export const BrowserSessionStatusResponse = z.object({
  sessionId: z.string().uuid(),
  storyId: z.string().uuid(),
  status: BrowserSessionStatus,
  performanceSummary: z.record(z.any()).optional(),
  startedAt: z.string(),
  endedAt: z.string().optional(),
});

export type BrowserSessionStartRequest = z.infer<typeof BrowserSessionStartRequest>;
export type BrowserSessionStatusResponse = z.infer<typeof BrowserSessionStatusResponse>;
import { z } from 'zod';
/**
 * T016: Zod schemas for browser MCP test sessions
 */

export const BrowserSessionStatusEnum = z.enum(['running','passed','failed','aborted']);

export const BrowserSessionStartRequest = z.object({
  storyId: z.string().uuid(),
  authProfile: z.string().optional(),
});

export const BrowserSessionStartResponse = z.object({
  sessionId: z.string().uuid(),
  status: BrowserSessionStatusEnum,
  startedAt: z.string().datetime(),
});

export const BrowserSessionStatusResponse = z.object({
  sessionId: z.string().uuid(),
  storyId: z.string().uuid(),
  status: BrowserSessionStatusEnum,
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable().optional(),
  performanceSummary: z.record(z.any()).optional(),
  correlationId: z.string().uuid(),
});

export type BrowserSessionStartRequest = z.infer<typeof BrowserSessionStartRequest>;
export type BrowserSessionStartResponse = z.infer<typeof BrowserSessionStartResponse>;
export type BrowserSessionStatusResponse = z.infer<typeof BrowserSessionStatusResponse>;
