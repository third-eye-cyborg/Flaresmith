import { z } from "zod";

export const ApplySpecRequestSchema = z.object({
  projectId: z.string().uuid(),
});

export const DriftReportSchema = z.object({
  changedFiles: z.array(
    z.object({
      path: z.string(),
      changeType: z.enum(["created", "modified", "deleted"]),
      linesAdded: z.number().optional(),
      linesRemoved: z.number().optional(),
    })
  ),
  conflicts: z
    .array(
      z.object({
        path: z.string(),
        reason: z.string(),
        resolution: z.string().optional(),
      })
    )
    .optional(),
  summary: z.object({
    totalFiles: z.number(),
    filesCreated: z.number(),
    filesModified: z.number(),
    filesDeleted: z.number(),
    hasConflicts: z.boolean(),
  }),
  appliedAt: z.string().datetime(),
});

export const ApplySpecResponseSchema = DriftReportSchema;

export type ApplySpecRequest = z.infer<typeof ApplySpecRequestSchema>;
export type ApplySpecResponse = z.infer<typeof ApplySpecResponseSchema>;
export type DriftReport = z.infer<typeof DriftReportSchema>;
