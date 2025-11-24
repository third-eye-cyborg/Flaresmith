import React from 'react';
import { designSyncFlagSnapshot } from '../../api/src/config/flags';

export default function DesignSyncPage() {
  if (!designSyncFlagSnapshot.DESIGN_SYNC_ENABLED) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">Design Sync Disabled</h1>
        <p className="text-sm opacity-80">Enable the feature flag DESIGN_SYNC_ENABLED to access synchronization workflows.</p>
      </div>
    );
  }
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Design Sync & Integration Hub</h1>
      <p className="text-sm mb-4">This is a placeholder. Upcoming: diff preview, sync controls, coverage dashboard, credential status, browser sessions.</p>
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li>Manual Sync</li>
        <li>Undo / Redo History</li>
        <li>Drift Report</li>
        <li>Coverage & Scaffolds</li>
        <li>Credential Governance</li>
        <li>Browser Test Sessions</li>
      </ul>
    </div>
  );
}
