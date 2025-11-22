import { z } from "zod";

export const ApplySpecRequestSchema = z.object({
  projectId: z.string().uuid(),
});

export const DriftConflictSchema = z.object({
  path: z.string(),
  reason: z.string(),
  resolution: z.string().optional(),
  suggestedAction: z.string().optional(),
});

export const DriftChangedFileSchema = z.object({
  path: z.string(),
  changeType: z.enum(["created", "modified", "deleted"]),
  linesAdded: z.number().optional(),
  linesRemoved: z.number().optional(),
  checksumBefore: z.string().optional(),
  checksumAfter: z.string().optional(),
});

export const DriftReportSummarySchema = z.object({
  totalFiles: z.number(),
  filesCreated: z.number(),
  filesModified: z.number(),
  filesDeleted: z.number(),
  hasConflicts: z.boolean(),
  conflictCount: z.number(),
});

export const DriftReportSchema = z.object({
  changedFiles: z.array(DriftChangedFileSchema),
  conflicts: z.array(DriftConflictSchema).optional(),
  summary: DriftReportSummarySchema,
  appliedAt: z.string().datetime(),
});

export const ApplySpecResponseSchema = DriftReportSchema;

export type ApplySpecRequest = z.infer<typeof ApplySpecRequestSchema>;
export type ApplySpecResponse = z.infer<typeof ApplySpecResponseSchema>;
export type DriftReport = z.infer<typeof DriftReportSchema>;
export type DriftConflict = z.infer<typeof DriftConflictSchema>;
export type DriftChangedFile = z.infer<typeof DriftChangedFileSchema>;
export type DriftReportSummary = z.infer<typeof DriftReportSummarySchema>;
