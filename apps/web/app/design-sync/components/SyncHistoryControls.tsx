// T050: SyncHistoryControls component
// Feature: 006-design-sync-integration
// Provides undo capability for a given operationId, with simple input for manual testing.
// Spec References: FR-002 (undo history), FR-009 (audit), SC-003

'use client';
import React, { useState } from 'react';

interface SyncHistoryControlsProps {
  apiBaseUrl: string;
  lastOperationId?: string; // Optionally auto-filled after a sync
}

export const SyncHistoryControls: React.FC<SyncHistoryControlsProps> = ({ apiBaseUrl, lastOperationId }) => {
  const [operationId, setOperationId] = useState(lastOperationId || '');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function undo() {
    if (!operationId) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${apiBaseUrl}/design-sync/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationId }),
      });
      if (!res.ok) throw new Error(`Undo failed: ${res.status}`);
      const json = await res.json();
      setResult(json);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={operationId}
          onChange={e => setOperationId(e.target.value)}
          placeholder="Operation ID"
          className="border rounded px-2 py-1 text-xs flex-1"
        />
        <button
          onClick={undo}
          disabled={!operationId || pending}
          className="px-3 py-1.5 rounded bg-purple-600 text-white text-xs disabled:opacity-50"
        >
          {pending ? 'Undoing…' : 'Undo'}
        </button>
      </div>
      {error && <div className="text-xs text-red-600">Error: {error}</div>}
      {result && (
        <div className="text-xs border rounded p-2 bg-gray-50 space-y-1">
          <div className="font-semibold">Undo Result</div>
          <div>Status: {result.status}</div>
          <div>Restored Components: {Array.isArray(result.restoredComponents) ? result.restoredComponents.length : 0}</div>
          <div>Duration: {result.durationMs}ms</div>
        </div>
      )}
    </div>
  );
};

export default SyncHistoryControls;
