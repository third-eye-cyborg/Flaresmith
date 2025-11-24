// T065: Coverage Dashboard UI Component
// Feature: 006-design-sync-integration
// Displays variant coverage %, missing variants, and test scaffold presence
// Spec References: FR-011, FR-012, SC-005

'use client';

import { useState, useEffect } from 'react';

interface CoverageReport {
  componentId: string;
  componentName: string;
  variantCoveragePct: number;
  missingVariants: string[];
  missingTests: Array<{
    variantName: string;
    missingTestTypes: string[];
  }>;
  warnings: string[];
  generatedAt: string;
}

interface CoverageSummary {
  reports: CoverageReport[];
  overallVariantCoveragePct: number;
  totalComponents: number;
  durationMs: number;
}

interface CoverageDashboardProps {
  apiEndpoint?: string;
  refreshInterval?: number; // Auto-refresh interval in ms (0 = disabled)
}

export function CoverageDashboard({ 
  apiEndpoint = '/api/design-sync/coverage',
  refreshInterval = 0 
}: CoverageDashboardProps) {
  const [summary, setSummary] = useState<CoverageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchCoverage = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = forceRefresh 
        ? `${apiEndpoint}?refresh=true` 
        : apiEndpoint;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: CoverageSummary = await response.json();
      setSummary(data);
      setLastRefresh(new Date());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoverage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => fetchCoverage(), refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshInterval]);

  const getCoverageColor = (pct: number): string => {
    if (pct >= 90) return 'text-green-600';
    if (pct >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCoverageBgColor = (pct: number): string => {
    if (pct >= 90) return 'bg-green-100';
    if (pct >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading coverage data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-800 font-semibold">Coverage Load Error</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
        <button
          onClick={() => fetchCoverage()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-gray-600">No coverage data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Coverage Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">
            {summary.totalComponents} component{summary.totalComponents !== 1 ? 's' : ''} analyzed
            {lastRefresh && (
              <span className="ml-2">
                • Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchCoverage(true)}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Force Refresh'}
        </button>
      </div>

      {/* Overall Summary Card */}
      <div className={`p-6 rounded-lg border-2 ${getCoverageBgColor(summary.overallVariantCoveragePct)}`}>
        <div className="flex items-baseline gap-3">
          <div className={`text-5xl font-bold ${getCoverageColor(summary.overallVariantCoveragePct)}`}>
            {summary.overallVariantCoveragePct}%
          </div>
          <div className="text-gray-700 text-lg">Overall Variant Coverage</div>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Generated in {summary.durationMs}ms
        </div>
      </div>

      {/* Component Reports */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Component Details</h3>
        
        {summary.reports.map((report) => (
          <ComponentCoverageCard key={report.componentId} report={report} />
        ))}
      </div>
    </div>
  );
}

interface ComponentCoverageCardProps {
  report: CoverageReport;
}

function ComponentCoverageCard({ report }: ComponentCoverageCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getCoverageColor = (pct: number): string => {
    if (pct >= 90) return 'text-green-600';
    if (pct >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const totalMissingTests = report.missingTests.reduce(
    (sum, item) => sum + item.missingTestTypes.length,
    0
  );

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
      {/* Card Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
      >
        <div className="flex items-center gap-4">
          <div className={`text-2xl font-bold ${getCoverageColor(report.variantCoveragePct)}`}>
            {report.variantCoveragePct}%
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{report.componentName}</div>
            <div className="text-sm text-gray-500">
              {report.missingVariants.length} missing variant{report.missingVariants.length !== 1 ? 's' : ''}
              {' • '}
              {totalMissingTests} missing test{totalMissingTests !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className="text-gray-400">
          {expanded ? '▲' : '▼'}
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-6 pb-4 space-y-4 border-t border-gray-100">
          {/* Missing Variants */}
          {report.missingVariants.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">
                Missing Variants ({report.missingVariants.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {report.missingVariants.map((variant) => (
                  <span
                    key={variant}
                    className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full"
                  >
                    {variant}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Tests */}
          {report.missingTests.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">
                Missing Tests ({totalMissingTests})
              </div>
              <div className="space-y-2">
                {report.missingTests.map((item) => (
                  <div key={item.variantName} className="flex items-start gap-3">
                    <span className="text-sm text-gray-600 font-medium min-w-[120px]">
                      {item.variantName}:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {item.missingTestTypes.map((testType) => (
                        <span
                          key={testType}
                          className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded"
                        >
                          {testType}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {report.warnings.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-2">
                Warnings ({report.warnings.length})
              </div>
              <ul className="list-disc list-inside space-y-1">
                {report.warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-orange-700">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              Generated: {new Date(report.generatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
