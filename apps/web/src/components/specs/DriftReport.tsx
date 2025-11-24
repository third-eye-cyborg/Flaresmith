"use client";
import type { ApplySpecResponse } from "@flaresmith/types";

type DriftReportProps = {
  report?: ApplySpecResponse | null;
  className?: string;
};

export function DriftReport({ report, className }: DriftReportProps) {
  if (!report) {
    return (
      <div className={className}>
        <p className="text-sm text-gray-500">No drift report to display.</p>
      </div>
    );
  }

  const { summary, changedFiles, conflicts } = report;

  return (
    <div className={className}>
      <h3 className="font-semibold mb-2">Spec Apply Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
        <div className="p-2 rounded bg-gray-50">Total: {summary.totalFiles}</div>
        <div className="p-2 rounded bg-green-50">Created: {summary.filesCreated}</div>
        <div className="p-2 rounded bg-yellow-50">Modified: {summary.filesModified}</div>
        <div className="p-2 rounded bg-red-50">Deleted: {summary.filesDeleted}</div>
        <div className="p-2 rounded {summary.hasConflicts ? 'bg-red-100' : 'bg-gray-50'}">
          Conflicts: {summary.hasConflicts ? "Yes" : "No"}
        </div>
      </div>

      <h4 className="mt-4 font-medium">Changed Files</h4>
      {changedFiles.length === 0 ? (
        <p className="text-sm text-gray-500">No changes detected.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {changedFiles.map((f, idx) => (
            <li key={`${f.path}-${idx}`} className="flex items-center gap-2">
              <span
                className={
                  f.changeType === "created"
                    ? "px-2 py-0.5 rounded text-xs bg-green-100 text-green-700"
                    : f.changeType === "modified"
                    ? "px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700"
                    : "px-2 py-0.5 rounded text-xs bg-red-100 text-red-700"
                }
              >
                {f.changeType}
              </span>
              <code className="text-gray-800">{f.path}</code>
              {typeof f.linesAdded === "number" || typeof f.linesRemoved === "number" ? (
                <span className="text-gray-500">
                  ({f.linesAdded ?? 0}+/{f.linesRemoved ?? 0}-)
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {conflicts && conflicts.length > 0 ? (
        <>
          <h4 className="mt-4 font-medium text-red-700">Conflicts</h4>
          <ul className="mt-2 space-y-1 text-sm">
            {conflicts.map((c, idx) => (
              <li key={`${c.path}-${idx}`} className="flex flex-col">
                <div className="flex items-center gap-2">
                  <code className="text-gray-800">{c.path}</code>
                </div>
                <div className="text-gray-600">{c.reason}</div>
                {c.resolution ? (
                  <div className="text-gray-500">Resolution: {c.resolution}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="mt-4 text-xs text-gray-500">Applied at: {report.appliedAt}</p>
    </div>
  );
}

export default DriftReport;
