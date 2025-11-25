import { z } from "zod";

export const ApplyDiffFileChangeSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const ApplyDiffRequestSchema = z.object({
  sessionId: z.string().uuid(),
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1),
  baseCommitSha: z.string().min(1),
  message: z.string().min(1),
  diffs: z.array(ApplyDiffFileChangeSchema).min(1),
});

export const ApplyDiffResponseSchema = z.object({ commitSha: z.string().min(1) });

export type ApplyDiffRequest = z.infer<typeof ApplyDiffRequestSchema>;
export type ApplyDiffResponse = z.infer<typeof ApplyDiffResponseSchema>;
