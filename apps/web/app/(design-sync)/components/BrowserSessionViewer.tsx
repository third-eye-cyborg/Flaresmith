// T085: Browser session viewer UI component
// Feature: 006-design-sync-integration
// Real-time browser test session monitoring with performance metrics
// Spec References: FR-018, US5

'use client';

import { useState, useEffect } from 'react';

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

// Session status presentation configuration (uses Tailwind design tokens; no inline styles)
const STATUS_CONFIG = {
  running: { label: '🔄 Running', cardBg: 'bg-blue-50', badgeBg: 'bg-blue-600' },
  passed: { label: '✅ Passed', cardBg: 'bg-green-50', badgeBg: 'bg-emerald-600' },
  failed: { label: '❌ Failed', cardBg: 'bg-red-50', badgeBg: 'bg-red-600' },
  aborted: { label: '⏹️ Aborted', cardBg: 'bg-gray-50', badgeBg: 'bg-gray-600' },
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

  // Map metric status to Tailwind text color classes
  const getMetricClass = (status: string) => {
    const map: Record<string, string> = {
      good: 'text-emerald-600',
      needsImprovement: 'text-amber-600',
      poor: 'text-red-600',
      neutral: 'text-gray-600',
    };
    return map[status] || map.neutral;
  };

  if (loading) {
    return (
      <div className="p-5 text-center">
        <div>Loading browser sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 text-red-500">
        <div>Error: {error}</div>
        <button 
          type="button"
          onClick={fetchSessions} 
          className="mt-2.5 px-4 py-2 rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold">Browser Test Sessions</h2>
        <button
          type="button"
          onClick={fetchSessions}
          className="px-4 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Session list */}
      <div className="grid gap-4">
        {sessions.length === 0 && (
          <div className="py-10 text-center text-gray-500">
            No browser sessions found
          </div>
        )}

        {sessions.map((session) => {
          const statusInfo = STATUS_CONFIG[session.status];
          return (
            <div
              key={session.sessionId}
              className={`${statusInfo.cardBg} p-4 rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => setSelectedSession(session)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold mb-2">
                    Session {session.sessionId.slice(0, 8)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Story: {session.storyId.slice(0, 8)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Duration: {formatDuration(session.startTime, session.endTime)}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-white text-xs font-bold ${statusInfo.badgeBg}`}>
                  {statusInfo.label}
                </div>
              </div>

              {/* Performance summary inline preview */}
              {session.performanceSummary && showPerformanceCharts && (
                <div className="mt-3 flex gap-3 text-xs">
                  {session.performanceSummary.lcp && (
                    <div>
                      LCP:{' '}
                      <span
                        className={`font-bold ${getMetricClass(getMetricStatus('lcp', session.performanceSummary.lcp))}`}
                      >
                        {session.performanceSummary.lcp}ms
                      </span>
                    </div>
                  )}
                  {session.performanceSummary.fid && (
                    <div>
                      FID:{' '}
                      <span
                        className={`font-bold ${getMetricClass(getMetricStatus('fid', session.performanceSummary.fid))}`}
                      >
                        {session.performanceSummary.fid}ms
                      </span>
                    </div>
                  )}
                  {session.performanceSummary.cls !== undefined && (
                    <div>
                      CLS:{' '}
                      <span
                        className={`font-bold ${getMetricClass(getMetricStatus('cls', session.performanceSummary.cls))}`}
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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-2xl w-11/12 max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Session Details</h3>
              <button 
                type="button"
                onClick={() => setSelectedSession(null)} 
                className="text-xl text-gray-500 hover:text-gray-700 transition-colors p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 text-sm">
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
                <div className="mt-4">
                  <strong className="block mb-2">Performance Metrics:</strong>
                  <div className="grid gap-2 pl-4">
                    {Object.entries(selectedSession.performanceSummary).map(([key, value]) => {
                      if (typeof value !== 'number') return null;
                      const status = getMetricStatus(key as keyof PerformanceSummary, value);
                      return (
                        <div key={key} className="flex justify-between">
                          <span>{key.toUpperCase()}:</span>
                          <span className={`font-bold ${getMetricClass(status)}`}>
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
                <div className="mt-4">
                  <strong className="block mb-2">Metadata:</strong>
                  <pre className="bg-gray-100 p-3 rounded-md text-xs overflow-auto">
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
