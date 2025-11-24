// T052: SyncStateBoundary component
// Feature: 006-design-sync-integration
// Provides optimistic UI state context + error boundary for sync operations.
// Spec References: FR-001 (preview + confirm), FR-002 (undo feedback), FR-015 (confirm step), reliability concerns.

'use client';
import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface SyncState {
  lastOperationId?: string;
  pending: boolean;
  setPending: (v: boolean) => void;
  setLastOperationId: (id?: string) => void;
}

const SyncStateCtx = createContext<SyncState | undefined>(undefined);

export const useSyncState = () => {
  const ctx = useContext(SyncStateCtx);
  if (!ctx) throw new Error('useSyncState must be used within SyncStateBoundary');
  return ctx;
};

class Boundary extends React.Component<{ children: ReactNode }, { error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: undefined };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  componentDidCatch(_error: Error, _info: any) {
    // Placeholder: integrate audit logging if desired.
  }
  render() {
    if (this.state.error) {
      return (
        <div className="border border-red-400 bg-red-50 text-red-700 p-4 rounded text-sm">
          <div className="font-semibold mb-1">UI Error</div>
          <div>{this.state.error.message}</div>
          <button
            className="mt-2 px-3 py-1.5 text-xs bg-red-600 text-white rounded"
            onClick={() => this.setState({ error: undefined })}
          >
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const SyncStateBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState(false);
  const [lastOperationId, setLastOperationId] = useState<string | undefined>(undefined);
  const value: SyncState = { pending, setPending, lastOperationId, setLastOperationId };
  return (
    <Boundary>
      <SyncStateCtx.Provider value={value}>{children}</SyncStateCtx.Provider>
    </Boundary>
  );
};

export default SyncStateBoundary;
