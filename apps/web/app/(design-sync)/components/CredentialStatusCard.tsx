// T079: Credential Status Card UI Component
// Feature: 006-design-sync-integration
// Display credential provider status grid with action buttons
// Spec References: FR-017, US4

'use client';

import { useState, useEffect } from 'react';

interface Credential {
  id: string;
  providerType: 'notification' | 'design' | 'documentation' | 'testing' | 'ai' | 'analytics';
  status: 'valid' | 'revoked' | 'expired' | 'pending';
  lastValidationTime: string | null;
  rotationDue: string | null;
  metadata: Record<string, unknown>;
}

interface CredentialStatusCardProps {
  apiEndpoint?: string;
  refreshInterval?: number;
}

const PROVIDER_LABELS: Record<string, string> = {
  notification: 'Notification Service',
  design: 'Design Tools',
  documentation: 'Documentation',
  testing: 'Testing Framework',
  ai: 'AI/ML Services',
  analytics: 'Analytics',
};

const STATUS_COLORS: Record<string, string> = {
  valid: '#10b981', // green
  expired: '#f59e0b', // yellow
  pending: '#6b7280', // gray
  revoked: '#ef4444', // red
};

export function CredentialStatusCard({ apiEndpoint = '/api/design-sync/credentials', refreshInterval = 0 }: CredentialStatusCardProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchCredentials = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiEndpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setCredentials(data.credentials || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (credentialId: string, action: 'validate' | 'rotate' | 'revoke') => {
    setActionInProgress(credentialId);
    setError(null);

    try {
      const response = await fetch(`${apiEndpoint}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId, action }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Refresh credentials after action
      await fetchCredentials();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} credential`);
    } finally {
      setActionInProgress(null);
    }
  };

  useEffect(() => {
    fetchCredentials();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchCredentials, refreshInterval);
      return () => clearInterval(interval);
    }
    
    return undefined;
  }, [apiEndpoint, refreshInterval]);

  if (loading && credentials.length === 0) {
    return <div className="credential-status-loading">Loading credentials...</div>;
  }

  if (error && credentials.length === 0) {
    return (
      <div className="credential-status-error">
        <p>Error: {error}</p>
        <button onClick={fetchCredentials}>Retry</button>
      </div>
    );
  }

  return (
    <div className="credential-status-container">
      <h2>Credential Status</h2>

      {error && <div className="error-banner">{error}</div>}

      <div className="credentials-grid">
        {credentials.map((cred) => (
          <div key={cred.id} className="credential-card">
            <div className="credential-header">
              <h3>{PROVIDER_LABELS[cred.providerType] || cred.providerType}</h3>
              <span className="status-badge" style={{ backgroundColor: STATUS_COLORS[cred.status] }}>
                {cred.status}
              </span>
            </div>

            <div className="credential-details">
              {cred.lastValidationTime && (
                <div className="detail-row">
                  <span>Last Validated:</span>
                  <span>{new Date(cred.lastValidationTime).toLocaleString()}</span>
                </div>
              )}
              {cred.rotationDue && (
                <div className="detail-row">
                  <span>Rotation Due:</span>
                  <span>{new Date(cred.rotationDue).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="credential-actions">
              <button onClick={() => performAction(cred.id, 'validate')} disabled={actionInProgress === cred.id || cred.status === 'revoked'}>
                {actionInProgress === cred.id ? 'Processing...' : 'Validate'}
              </button>
              <button onClick={() => performAction(cred.id, 'rotate')} disabled={actionInProgress === cred.id || cred.status === 'revoked'}>
                Rotate
              </button>
              <button onClick={() => performAction(cred.id, 'revoke')} disabled={actionInProgress === cred.id || cred.status === 'revoked'} className="revoke-btn">
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>

      {credentials.length === 0 && <p className="no-credentials">No credentials found</p>}

      <style jsx>{`
        .credential-status-container {
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        h2 {
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .error-banner {
          padding: 0.75rem;
          margin-bottom: 1rem;
          background: #fee;
          color: #c00;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .credentials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .credential-card {
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .credential-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .credential-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 500;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          color: white;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .credential-details {
          margin-bottom: 1rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 0.875rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .detail-row span:first-child {
          color: #6b7280;
        }

        .credential-actions {
          display: flex;
          gap: 0.5rem;
        }

        .credential-actions button {
          flex: 1;
          padding: 0.5rem;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .credential-actions button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .revoke-btn {
          background: #ef4444 !important;
        }

        .no-credentials {
          text-align: center;
          color: #6b7280;
          padding: 2rem;
        }

        .credential-status-loading,
        .credential-status-error {
          padding: 2rem;
          text-align: center;
        }

        .credential-status-error button {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
