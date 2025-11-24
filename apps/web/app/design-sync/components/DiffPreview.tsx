// T048: DiffPreview component
// Feature: 006-design-sync-integration
// Displays drift items allowing selection/exclusion prior to sync.
// Spec References: FR-001, FR-004, FR-005

'use client';
import React, { useEffect, useState } from 'react';

interface DriftItemDisplay {
  componentId: string;
  changeTypes: string[];
  severity?: 'low' | 'medium' | 'high';
  selected: boolean;
}

interface DiffPreviewProps {
  apiBaseUrl: string;
  onSelectionChange?: (selectedIds: string[]) => void;
}

export const DiffPreview: React.FC<DiffPreviewProps> = ({ apiBaseUrl, onSelectionChange }) => {
  const [items, setItems] = useState<DriftItemDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/design-sync/drift`);
        if (!res.ok) throw new Error(`Drift request failed: ${res.status}`);
        const json = await res.json();
        const mapped: DriftItemDisplay[] = (json.components || []).map((c: any) => ({
          componentId: c.componentId || c.componentName,
          changeTypes: c.changeTypes || [],
          severity: c.severity,
          selected: true,
        }));
        if (mounted) setItems(mapped);
        if (onSelectionChange) onSelectionChange(mapped.map(i => i.componentId));
      } catch (e: any) {
        if (mounted) setError(e.message || 'Unknown error');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [apiBaseUrl, onSelectionChange]);

  function toggle(id: string) {
    setItems(prev => {
      const next = prev.map(i => i.componentId === id ? { ...i, selected: !i.selected } : i);
      if (onSelectionChange) onSelectionChange(next.filter(i => i.selected).map(i => i.componentId));
      return next;
    });
  }

  if (loading) return <div className="p-4 text-sm">Loading drift…</div>;
  if (error) return <div className="p-4 text-red-600 text-sm">Error: {error}</div>;
  if (!items.length) return <div className="p-4 text-sm">No drift detected.</div>;

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.componentId} className="border rounded p-2 flex items-start gap-3">
          <input
            type="checkbox"
            checked={item.selected}
            onChange={() => toggle(item.componentId)}
            aria-label={`Select component ${item.componentId}`}
          />
          <div className="flex-1">
            <div className="font-medium flex items-center gap-2">
              <span>{item.componentId}</span>
              {item.severity && (
                <span className={`text-xs px-2 py-0.5 rounded bg-gray-100 border ${item.severity === 'high' ? 'border-red-500 text-red-600' : item.severity === 'medium' ? 'border-yellow-500 text-yellow-600' : 'border-green-500 text-green-600'}`}>{item.severity}</span>
              )}
            </div>
            <ul className="ml-4 list-disc text-xs text-gray-600">
              {item.changeTypes.map(ct => <li key={ct}>{ct}</li>)}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DiffPreview;
