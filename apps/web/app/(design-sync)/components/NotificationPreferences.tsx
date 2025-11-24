// T072: Notification Preferences UI Component
// Feature: 006-design-sync-integration
// Per-user notification category toggles and digest configuration
// Spec References: FR-016, US3

'use client';

import { useState, useEffect } from 'react';

interface CategoryPreferences {
  sync_completed: boolean;
  drift_detected: boolean;
  coverage_summary: boolean;
  digest: boolean;
  credential_status: boolean;
  browser_test_failure: boolean;
}

interface NotificationPreferences {
  userId: string;
  projectId: string | null;
  categoryPreferences: CategoryPreferences;
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly' | 'never';
  digestTimeUtc: string; // HH:MM format
}

interface NotificationPreferencesProps {
  userId: string;
  projectId?: string | null;
  apiEndpoint?: string;
  onSaveSuccess?: () => void;
}

// Category display labels
const CATEGORY_LABELS: Record<keyof CategoryPreferences, string> = {
  sync_completed: 'Sync Completed',
  drift_detected: 'Drift Detected',
  coverage_summary: 'Coverage Summary',
  digest: 'Digest Notifications',
  credential_status: 'Credential Status',
  browser_test_failure: 'Browser Test Failures',
};

export function NotificationPreferences({
  userId,
  projectId = null,
  apiEndpoint = '/api/design-sync/preferences',
  onSaveSuccess,
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const buildApiUrl = (params?: Record<string, string>) => {
    const url = new URL(`${apiEndpoint}/${userId}`, window.location.origin);
    if (projectId) {
      url.searchParams.set('projectId', projectId);
    }
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
  };

  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl());

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: NotificationPreferences = await response.json();
      setPreferences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(buildApiUrl(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryPreferences: preferences.categoryPreferences,
          digestEnabled: preferences.digestEnabled,
          digestFrequency: preferences.digestFrequency,
          digestTimeUtc: preferences.digestTimeUtc,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const updated: NotificationPreferences = await response.json();
      setPreferences(updated);
      setSaveMessage('Preferences saved successfully');
      onSaveSuccess?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [userId, projectId]);

  const toggleCategory = (category: keyof CategoryPreferences) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      categoryPreferences: {
        ...preferences.categoryPreferences,
        [category]: !preferences.categoryPreferences[category],
      },
    });
  };

  const updateDigestEnabled = (enabled: boolean) => {
    if (!preferences) return;
    setPreferences({ ...preferences, digestEnabled: enabled });
  };

  const updateDigestFrequency = (frequency: 'daily' | 'weekly' | 'never') => {
    if (!preferences) return;
    setPreferences({ ...preferences, digestFrequency: frequency });
  };

  const updateDigestTime = (time: string) => {
    if (!preferences) return;
    setPreferences({ ...preferences, digestTimeUtc: time });
  };

  if (loading) {
    return (
      <div className="notification-preferences-loading">
        <p>Loading preferences...</p>
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="notification-preferences-error">
        <p>Error: {error}</p>
        <button onClick={fetchPreferences}>Retry</button>
      </div>
    );
  }

  if (!preferences) {
    return null;
  }

  return (
    <div className="notification-preferences-container">
      <h2>Notification Preferences</h2>

      {/* Category Toggles */}
      <section className="category-preferences">
        <h3>Event Categories</h3>
        <p className="section-description">
          Choose which types of events trigger notifications
        </p>
        <div className="category-toggles">
          {(Object.keys(CATEGORY_LABELS) as Array<keyof CategoryPreferences>).map((category) => (
            <div key={category} className="category-toggle-item">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.categoryPreferences[category]}
                  onChange={() => toggleCategory(category)}
                  disabled={saving}
                />
                <span>{CATEGORY_LABELS[category]}</span>
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Digest Configuration */}
      <section className="digest-configuration">
        <h3>Digest Settings</h3>
        <p className="section-description">
          Receive periodic summaries of all events instead of individual notifications
        </p>

        <div className="digest-enabled-toggle">
          <label>
            <input
              type="checkbox"
              checked={preferences.digestEnabled}
              onChange={(e) => updateDigestEnabled(e.target.checked)}
              disabled={saving}
            />
            <span>Enable digest notifications</span>
          </label>
        </div>

        {preferences.digestEnabled && (
          <div className="digest-options">
            <div className="digest-frequency">
              <label htmlFor="digest-frequency">Frequency</label>
              <select
                id="digest-frequency"
                value={preferences.digestFrequency}
                onChange={(e) => updateDigestFrequency(e.target.value as 'daily' | 'weekly' | 'never')}
                disabled={saving}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="never">Never</option>
              </select>
            </div>

            <div className="digest-time">
              <label htmlFor="digest-time">Time (UTC)</label>
              <input
                id="digest-time"
                type="time"
                value={preferences.digestTimeUtc}
                onChange={(e) => updateDigestTime(e.target.value)}
                disabled={saving}
              />
              <small>Digest will be sent at this time in UTC timezone</small>
            </div>
          </div>
        )}
      </section>

      {/* Save Button and Status */}
      <div className="preferences-actions">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="save-button"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>

        {saveMessage && (
          <span className="save-success-message">{saveMessage}</span>
        )}

        {error && (
          <span className="save-error-message">{error}</span>
        )}
      </div>

      <style jsx>{`
        .notification-preferences-container {
          max-width: 600px;
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

        section {
          margin-bottom: 2rem;
        }

        h3 {
          margin-bottom: 0.5rem;
          font-size: 1.125rem;
          font-weight: 500;
        }

        .section-description {
          margin-bottom: 1rem;
          color: #666;
          font-size: 0.875rem;
        }

        .category-toggles {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .category-toggle-item label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
        }

        .category-toggle-item input[type='checkbox'] {
          width: 1.125rem;
          height: 1.125rem;
          cursor: pointer;
        }

        .digest-enabled-toggle {
          margin-bottom: 1rem;
        }

        .digest-enabled-toggle label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          font-weight: 500;
        }

        .digest-options {
          margin-top: 1rem;
          padding-left: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .digest-frequency label,
        .digest-time label {
          display: block;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .digest-frequency select,
        .digest-time input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .digest-time small {
          display: block;
          margin-top: 0.25rem;
          color: #666;
          font-size: 0.75rem;
        }

        .preferences-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .save-button {
          padding: 0.75rem 1.5rem;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
        }

        .save-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .save-success-message {
          color: #10b981;
          font-size: 0.875rem;
        }

        .save-error-message {
          color: #ef4444;
          font-size: 0.875rem;
        }

        .notification-preferences-loading,
        .notification-preferences-error {
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          text-align: center;
        }

        .notification-preferences-error button {
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
