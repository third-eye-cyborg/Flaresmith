/**
 * T072: Secret Sync Metrics Dashboard Component
 * Displays sync success rate, average duration, pending counts, and recent activity
 */

'use client';

import { useEffect, useState } from 'react';
import { useApiClient } from '../../hooks/useApiClient';

interface SyncMetrics {
  successRate: number;
  averageDurationMs: number;
  totalSyncs: number;
  pendingCount: number;
  errorCount: number;
  last24Hours: {
    syncs: number;
    successes: number;
    failures: number;
  };
  recentActivity: Array<{
    timestamp: string;
    operation: string;
    status: 'success' | 'failure' | 'partial';
    duration: number;
    secretCount: number;
  }>;
}

interface SecretSyncMetricsProps {
  projectId: string;
}

export function SecretSyncMetrics({ projectId }: SecretSyncMetricsProps) {
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiClient = useApiClient();

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch metrics from API (endpoint to be implemented)
        const response = await apiClient.get(`/github/secrets/metrics?projectId=${projectId}`);
        setMetrics(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [projectId, apiClient]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Metrics</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Secret Sync Metrics</h2>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Success Rate"
          value={`${metrics.successRate.toFixed(1)}%`}
          subtitle={`${metrics.totalSyncs} total syncs`}
          color={metrics.successRate >= 99 ? 'green' : metrics.successRate >= 95 ? 'yellow' : 'red'}
        />
        <MetricCard
          title="Avg Duration"
          value={formatDuration(metrics.averageDurationMs)}
          subtitle="Per sync operation"
          color="blue"
        />
        <MetricCard
          title="Pending Secrets"
          value={metrics.pendingCount}
          subtitle="Awaiting sync"
          color={metrics.pendingCount === 0 ? 'green' : 'yellow'}
        />
        <MetricCard
          title="Errors (24h)"
          value={metrics.last24Hours.failures}
          subtitle={`${metrics.last24Hours.syncs} syncs`}
          color={metrics.last24Hours.failures === 0 ? 'green' : 'red'}
        />
      </div>

      {/* 24-Hour Activity Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Last 24 Hours</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total Syncs</span>
            <span className="font-medium">{metrics.last24Hours.syncs}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Successful</span>
            <span className="font-medium text-green-600">{metrics.last24Hours.successes}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Failed</span>
            <span className="font-medium text-red-600">{metrics.last24Hours.failures}</span>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden" aria-label="24h success ratio">
              {(() => {
                const pct = metrics.last24Hours.syncs === 0 ? 0 : (metrics.last24Hours.successes / metrics.last24Hours.syncs) * 100;
                const rounded = Math.round(pct / 5) * 5; // 0,5,10,...100
                const widthClass = `w-[${rounded}%]`;
                return <div className={`h-full bg-green-500 transition-all duration-300 ${widthClass}`} role="progressbar" aria-label={`Success rate ${Math.round(pct)}%`} />;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {metrics.recentActivity.map((activity, index) => (
            <div 
              key={index}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center space-x-3">
                <StatusIndicator status={activity.status} />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {activity.operation}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-700">
                  {activity.secretCount} secrets
                </div>
                <div className="text-xs text-gray-500">
                  {formatDuration(activity.duration)}
                </div>
              </div>
            </div>
          ))}
          
          {metrics.recentActivity.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No recent activity
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-3">
        <button
          onClick={async () => {
            // Trigger manual sync
            try {
              await apiClient.post('/github/secrets/sync', { projectId });
              // Refresh metrics after sync
              window.location.reload();
            } catch (err) {
              alert('Sync failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Sync Now
        </button>
        <button
          onClick={() => {
            // View full audit log
            window.location.href = `/projects/${projectId}/audit`;
          }}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          View Audit Log
        </button>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  color: 'green' | 'yellow' | 'red' | 'blue';
}

function MetricCard({ title, value, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700'
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-sm font-medium opacity-80 mb-1">{title}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-xs opacity-70">{subtitle}</div>
    </div>
  );
}

interface StatusIndicatorProps {
  status: 'success' | 'failure' | 'partial';
}

function StatusIndicator({ status }: StatusIndicatorProps) {
  const statusConfig = {
    success: { color: 'bg-green-500', icon: '✓' },
    failure: { color: 'bg-red-500', icon: '✗' },
    partial: { color: 'bg-yellow-500', icon: '!' }
  };

  const config = statusConfig[status];

  return (
    <div className={`w-6 h-6 rounded-full ${config.color} flex items-center justify-center text-white text-xs font-bold`}>
      {config.icon}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
