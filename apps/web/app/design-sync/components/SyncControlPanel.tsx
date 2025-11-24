// T049: SyncControlPanel component
// Feature: 006-design-sync-integration
// Provides controls to initiate manual sync (direction + dry run) and displays result summary.
// Spec References: FR-001, FR-005, FR-015

'use client';
import React, { useState } from 'react';

interface SyncControlPanelProps {
  apiBaseUrl: string;
  selectedComponents: string[]; // Provided by DiffPreview selection
}

const directionOptions = [
  { value: 'bidirectional', label: 'Bidirectional' },
  { value: 'code_to_design', label: 'Code → Design' },
  { value: 'design_to_code', label: 'Design → Code' },
];

export const SyncControlPanel: React.FC<SyncControlPanelProps> = ({ apiBaseUrl, selectedComponents }) => {
  const [direction, setDirection] = useState('bidirectional');
  const [dryRun, setDryRun] = useState(true);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function triggerSync() {
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const body = {
        components: selectedComponents.map(id => ({ componentId: id, direction })),
        dryRun,
      };
      const res = await fetch(`${apiBaseUrl}/design-sync/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
      const json = await res.json();
      setResult(json);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium">Direction:</label>
        {directionOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setDirection(opt.value)}
            className={`px-3 py-1 rounded border text-xs ${direction === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
          >
            {opt.label}
          </button>
        ))}
        <label className="flex items-center gap-2 ml-4 text-xs">
          <input type="checkbox" checked={dryRun} onChange={() => setDryRun(d => !d)} /> Dry Run
        </label>
        <button
          disabled={!selectedComponents.length || pending}
          onClick={triggerSync}
          className="px-4 py-1.5 rounded bg-green-600 text-white text-sm disabled:opacity-50"
        >
          {pending ? 'Syncing…' : dryRun ? 'Preview Sync' : 'Execute Sync'}
        </button>
      </div>
      <div className="text-xs text-gray-600">Selected components: {selectedComponents.length || 0}</div>
      {error && <div className="text-xs text-red-600">Error: {error}</div>}
      {result && (
        <div className="border rounded p-3 text-xs space-y-1 bg-gray-50">
          <div className="font-semibold">Sync Result</div>
          <div>Operation ID: {result.operationId}</div>
          <div>Status: {result.status}</div>
          <div>Diff Items: {result.diffSummary?.total ?? result.applied ?? 0}</div>
          <div>Reversible Until: {result.reversibleUntil}</div>
          {dryRun && <div className="italic text-yellow-600">Dry run: no changes persisted.</div>}
        </div>
      )}
    </div>
  );
};

export default SyncControlPanel;
