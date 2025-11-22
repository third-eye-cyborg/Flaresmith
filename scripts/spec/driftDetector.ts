import type { GeneratedFile } from "./generators/zodSchemaGenerator";
import { z } from "zod";
import { DriftReportSchema } from "@cloudmake/types";

export type DriftReport = z.infer<typeof DriftReportSchema>;

/**
 * T087: AST-based drift detection (stub)
 * For now returns an empty drift report; later will compare generated content
 * against repository contents and previous checksums to detect changes.
 */
export async function computeDrift(_generated: GeneratedFile[]): Promise<DriftReport> {
  const appliedAt = new Date().toISOString();
  return {
    changedFiles: [],
    conflicts: [],
    summary: {
      totalFiles: 0,
      filesCreated: 0,
      filesModified: 0,
      filesDeleted: 0,
      hasConflicts: false,
    },
    appliedAt,
  };
}
