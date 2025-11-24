"use client";

export function DiffPreview({ diffs }: { diffs: Array<{ path: string; patch: string }> }) {
  if (!diffs?.length) return null;
  return (
    <div className="border rounded p-2 text-sm overflow-auto h-96">
      {diffs.map((d) => (
        <div key={d.path} className="mb-4">
          <div className="font-semibold">{d.path}</div>
          <pre className="bg-gray-50 rounded p-2 whitespace-pre-wrap text-xs">{d.patch}</pre>
        </div>
      ))}
    </div>
  );
}

export default DiffPreview;
