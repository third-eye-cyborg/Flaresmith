// T085: Browser session viewer UI component
// Feature: 006-design-sync-integration
// Real-time browser test session monitoring with performance metrics
// Spec References: FR-018, US5

'use client';

import React, { useState, useEffect } from 'react';

interface PerformanceSummary {
  lcp?: number; // Largest Contentful Paint (ms)
  fid?: number; // First Input Delay (ms)
  cls?: number; // Cumulative Layout Shift (score)
  ttfb?: number; // Time to First Byte (ms)
  authFlowDuration?: number; // Auth flow completion time (ms)
  [key: string]: unknown;
}

interface BrowserSession {
  sessionId: string;
  storyId: string;
  correlationId: string;
  status: 'running' | 'passed' | 'failed' | 'aborted';
  startTime: string; // ISO timestamp
  endTime: string | null;
  performanceSummary: PerformanceSummary | null;
  metadata?: Record<string, unknown>;
}

interface BrowserSessionViewerProps {
  projectId?: string;
  storyIdFilter?: string;
  refreshIntervalMs?: number; // Auto-refresh interval (default: 3000ms)
  showPerformanceCharts?: boolean; // Enable performance metric visualization
}

const STATUS_CONFIG = {
  running: { color: '#3b82f6', label: '🔄 Running', bgClass: 'bg-blue-50' },
  passed: { color: '#10b981', label: '✅ Passed', bgClass: 'bg-green-50' },
  failed: { color: '#ef4444', label: '❌ Failed', bgClass: 'bg-red-50' },
  aborted: { color: '#6b7280', label: '⏹️ Aborted', bgClass: 'bg-gray-50' },
} as const;

export function BrowserSessionViewer({
  projectId,
  storyIdFilter,
  refreshIntervalMs = 3000,
  showPerformanceCharts = true,
}: BrowserSessionViewerProps) {
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<BrowserSession | null>(null);

  // Fetch sessions
  const fetchSessions = async () => {
    try {
      // TODO: Replace with actual API endpoint when available
      // GET /design-sync/browser-sessions?projectId=...&storyId=...
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      if (storyIdFilter) params.append('storyId', storyIdFilter);

      // Mock data for now (will be replaced with actual API call)
      const mockSessions: BrowserSession[] = [
        {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          storyId: '123e4567-e89b-12d3-a456-426614174001',
          correlationId: '123e4567-e89b-12d3-a456-426614174002',
          status: 'running',
          startTime: new Date(Date.now() - 30000).toISOString(),
          endTime: null,
          performanceSummary: null,
        },
        {
          sessionId: '123e4567-e89b-12d3-a456-426614174003',
          storyId: '123e4567-e89b-12d3-a456-426614174004',
          correlationId: '123e4567-e89b-12d3-a456-426614174005',
          status: 'passed',
          startTime: new Date(Date.now() - 120000).toISOString(),
          endTime: new Date(Date.now() - 60000).toISOString(),
          performanceSummary: {
            lcp: 1200,
            fid: 50,
            cls: 0.05,
            ttfb: 300,
            authFlowDuration: 2500,
          },
        },
      ];

      setSessions(mockSessions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch + auto-refresh
  useEffect(() => {
    fetchSessions();

    if (refreshIntervalMs > 0) {
      const intervalId = setInterval(fetchSessions, refreshIntervalMs);
      return () => clearInterval(intervalId);
    }
    return undefined;
  }, [projectId, storyIdFilter, refreshIntervalMs]);

  // Format duration
  const formatDuration = (startTime: string, endTime: string | null) => {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const durationSec = Math.floor((end - start) / 1000);
    return `${durationSec}s`;
  };

  // Performance metric thresholds (Core Web Vitals)
  const getMetricStatus = (metric: keyof PerformanceSummary, value: number) => {
    const thresholds: Record<string, { good: number; needsImprovement: number }> = {
      lcp: { good: 2500, needsImprovement: 4000 }, // ms
      fid: { good: 100, needsImprovement: 300 }, // ms
      cls: { good: 0.1, needsImprovement: 0.25 }, // score
      ttfb: { good: 800, needsImprovement: 1800 }, // ms
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'neutral';
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needsImprovement';
    return 'poor';
  };

  const getMetricColor = (status: string) => {
    const colors = {
      good: '#10b981',
      needsImprovement: '#f59e0b',
      poor: '#ef4444',
      neutral: '#6b7280',
    };
    return colors[status as keyof typeof colors] || colors.neutral;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading browser sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#ef4444' }}>
        <div>Error: {error}</div>
        <button onClick={fetchSessions} style={{ marginTop: '10px', padding: '8px 16px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Browser Test Sessions</h2>
        <button
          onClick={fetchSessions}
          style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db' }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Session list */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {sessions.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No browser sessions found
          </div>
        )}

        {sessions.map((session) => {
          const statusInfo = STATUS_CONFIG[session.status];
          return (
            <div
              key={session.sessionId}
              className={statusInfo.bgClass}
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
              }}
              onClick={() => setSelectedSession(session)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                    Session {session.sessionId.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Story: {session.storyId.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Duration: {formatDuration(session.startTime, session.endTime)}
                  </div>
                </div>
                <div
                  style={{
                    padding: '4px 12px',
                    borderRadius: '16px',
                    backgroundColor: statusInfo.color,
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {statusInfo.label}
                </div>
              </div>

              {/* Performance summary inline preview */}
              {session.performanceSummary && showPerformanceCharts && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '12px', fontSize: '12px' }}>
                  {session.performanceSummary.lcp && (
                    <div>
                      LCP:{' '}
                      <span
                        style={{
                          color: getMetricColor(getMetricStatus('lcp', session.performanceSummary.lcp)),
                          fontWeight: 'bold',
                        }}
                      >
                        {session.performanceSummary.lcp}ms
                      </span>
                    </div>
                  )}
                  {session.performanceSummary.fid && (
                    <div>
                      FID:{' '}
                      <span
                        style={{
                          color: getMetricColor(getMetricStatus('fid', session.performanceSummary.fid)),
                          fontWeight: 'bold',
                        }}
                      >
                        {session.performanceSummary.fid}ms
                      </span>
                    </div>
                  )}
                  {session.performanceSummary.cls !== undefined && (
                    <div>
                      CLS:{' '}
                      <span
                        style={{
                          color: getMetricColor(getMetricStatus('cls', session.performanceSummary.cls)),
                          fontWeight: 'bold',
                        }}
                      >
                        {session.performanceSummary.cls.toFixed(3)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Session detail modal */}
      {selectedSession && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedSession(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>Session Details</h3>
              <button onClick={() => setSelectedSession(null)} style={{ fontSize: '20px' }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
              <div>
                <strong>Session ID:</strong> {selectedSession.sessionId}
              </div>
              <div>
                <strong>Story ID:</strong> {selectedSession.storyId}
              </div>
              <div>
                <strong>Correlation ID:</strong> {selectedSession.correlationId}
              </div>
              <div>
                <strong>Status:</strong> {STATUS_CONFIG[selectedSession.status].label}
              </div>
              <div>
                <strong>Start Time:</strong> {new Date(selectedSession.startTime).toLocaleString()}
              </div>
              {selectedSession.endTime && (
                <div>
                  <strong>End Time:</strong> {new Date(selectedSession.endTime).toLocaleString()}
                </div>
              )}

              {/* Performance metrics detail */}
              {selectedSession.performanceSummary && (
                <div style={{ marginTop: '16px' }}>
                  <strong style={{ display: 'block', marginBottom: '8px' }}>Performance Metrics:</strong>
                  <div style={{ display: 'grid', gap: '8px', paddingLeft: '16px' }}>
                    {Object.entries(selectedSession.performanceSummary).map(([key, value]) => {
                      if (typeof value !== 'number') return null;
                      const status = getMetricStatus(key as keyof PerformanceSummary, value);
                      return (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{key.toUpperCase()}:</span>
                          <span style={{ color: getMetricColor(status), fontWeight: 'bold' }}>
                            {key === 'cls' ? value.toFixed(3) : `${value}ms`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedSession.metadata && Object.keys(selectedSession.metadata).length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <strong style={{ display: 'block', marginBottom: '8px' }}>Metadata:</strong>
                  <pre
                    style={{
                      backgroundColor: '#f3f4f6',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(selectedSession.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
