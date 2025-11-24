import type { GeneratedFile } from "./generators/zodSchemaGenerator";
import { z } from "zod";
import { DriftReportSchema, DriftConflict, DriftChangedFile, DriftReportSummary } from "@cloudmake/types";
import { execSync } from "child_process";
import * as fs from "fs";
import * as crypto from "crypto";

export type DriftReport = z.infer<typeof DriftReportSchema>;

/**
 * T087: AST-based drift detection (stub)
 * For now returns an empty drift report; later will compare generated content
 * against repository contents and previous checksums to detect changes.
 */
function sha256(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Detect uncommitted changes via `git status --porcelain`.
 * Marks conflicts with reason UNCOMMITTED_CHANGES for any generated artifact paths
 * that appear modified, deleted, or untracked.
 */
function detectUncommittedConflicts(generated: GeneratedFile[]): DriftConflict[] {
  let output = "";
  try {
    output = execSync("git status --porcelain", { encoding: "utf8" });
  } catch {
    // Git not available (CI or snapshot) - treat as no conflicts
    return [];
  }

  const artifactPaths = new Set(generated.map(g => g.targetPath));
  const conflicts: DriftConflict[] = [];
  const lines = output.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    // Format: XY path
    const status = line.slice(0, 2).trim();
    const path = line.slice(3).trim();
    if (artifactPaths.has(path)) {
      let reason = "UNCOMMITTED_CHANGES";
      if (/^D/.test(status)) reason = "UNCOMMITTED_DELETION";
      else if (/^\?/.test(status)) reason = "UNTRACKED_ARTIFACT";
      conflicts.push({ path, reason, resolution: undefined, suggestedAction: "Commit or revert local edits before applying spec." });
    }
  }
  return conflicts;
}

/**
 * Compute drift between generated files and existing filesystem state.
 * Currently compares checksum to detect created/modified/deleted status.
 */
export async function computeDrift(generated: GeneratedFile[]): Promise<DriftReport> {
  const changedFiles: DriftChangedFile[] = [];
  let filesCreated = 0, filesModified = 0, filesDeleted = 0;

  for (const file of generated) {
    const exists = fs.existsSync(file.targetPath);
    if (!exists) {
      filesCreated++;
      changedFiles.push({ path: file.targetPath, changeType: "created", linesAdded: file.content.split(/\n/).length, checksumAfter: sha256(file.content) });
      continue;
    }
    const currentContent = fs.readFileSync(file.targetPath, "utf8");
    const currentChecksum = sha256(currentContent);
    const newChecksum = sha256(file.content);
    if (currentChecksum !== newChecksum) {
      filesModified++;
      changedFiles.push({ path: file.targetPath, changeType: "modified", checksumBefore: currentChecksum, checksumAfter: newChecksum });
    }
  }

  // Detect deleted artifacts (present on disk mapping not in generated list?) - placeholder skipped for now

  const conflicts = detectUncommittedConflicts(generated);

  const totalFiles = generated.length;
  const summary: DriftReportSummary = {
    totalFiles,
    filesCreated,
    filesModified,
    filesDeleted,
    hasConflicts: conflicts.length > 0,
    conflictCount: conflicts.length,
  };

  return {
    changedFiles,
    conflicts,
    summary,
    appliedAt: new Date().toISOString(),
  };
}
