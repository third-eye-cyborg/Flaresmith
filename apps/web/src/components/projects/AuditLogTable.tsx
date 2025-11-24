/**
 * T073: Audit Log Table Component (supporting component for audit page)
 * Displays filterable table of secret_sync_events with pagination
 */

'use client';

import { useEffect, useState } from 'react';
import { useApiClient } from '../../hooks/useApiClient';

interface SecretSyncEvent {
  id: string;
  operationType: 'sync' | 'validate' | 'create_environment' | 'update_secret';
  status: 'success' | 'failure' | 'partial';
  timestamp: string;
  actor: string;
  correlationId: string;
  secretCount: number;
  duration: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

interface AuditLogTableProps {
  projectId: string;
  currentPage: number;
  filters: {
    operationType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    actor?: string;
  };
}

export function AuditLogTable({ projectId, currentPage, filters }: AuditLogTableProps) {
  const [events, setEvents] = useState<SecretSyncEvent[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiClient = useApiClient();

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams({
          projectId,
          page: currentPage.toString(),
          limit: '50',
          ...(filters.operationType && { operationType: filters.operationType }),
          ...(filters.status && { status: filters.status }),
          ...(filters.startDate && { startDate: filters.startDate }),
          ...(filters.endDate && { endDate: filters.endDate }),
          ...(filters.actor && { actor: filters.actor })
        });

        const response = await apiClient.get(`/github/secrets/audit?${queryParams}`);
        setEvents(response.data.events);
        setTotalPages(response.data.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit log');
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [projectId, currentPage, filters, apiClient]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Audit Log</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <FilterBar currentFilters={filters} />

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Operation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Secrets
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Correlation ID
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(event.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {event.operationType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <StatusBadge status={event.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {event.actor}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {event.secretCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {formatDuration(event.duration)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                  <button
                    onClick={() => {
                      // Copy correlation ID to clipboard
                      navigator.clipboard.writeText(event.correlationId);
                      alert('Correlation ID copied to clipboard');
                    }}
                    className="hover:text-blue-600 transition-colors"
                    title="Click to copy"
                  >
                    {event.correlationId.substring(0, 8)}...
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {events.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No audit events found matching the current filters
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}

interface StatusBadgeProps {
  status: 'success' | 'failure' | 'partial';
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    success: { color: 'bg-green-100 text-green-800', label: 'Success' },
    failure: { color: 'bg-red-100 text-red-800', label: 'Failure' },
    partial: { color: 'bg-yellow-100 text-yellow-800', label: 'Partial' }
  };

  const { color, label } = config[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

interface FilterBarProps {
  currentFilters: {
    operationType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    actor?: string;
  };
}

function FilterBar({ currentFilters }: FilterBarProps) {
  const [localFilters, setLocalFilters] = useState(currentFilters);

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (localFilters.operationType) params.set('operationType', localFilters.operationType);
    if (localFilters.status) params.set('status', localFilters.status);
    if (localFilters.startDate) params.set('startDate', localFilters.startDate);
    if (localFilters.endDate) params.set('endDate', localFilters.endDate);
    if (localFilters.actor) params.set('actor', localFilters.actor);
    
    window.location.search = params.toString();
  };

  const handleClearFilters = () => {
    window.location.search = '';
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Operation Type
          </label>
          <select title="Filter by operation type" aria-label="Filter by operation type"
            value={localFilters.operationType || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, operationType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="sync">Sync</option>
            <option value="validate">Validate</option>
            <option value="create_environment">Create Environment</option>
            <option value="update_secret">Update Secret</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select title="Filter by status" aria-label="Filter by status"
            value={localFilters.status || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="partial">Partial</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            title="Filter start date"
            aria-label="Filter start date"
            value={localFilters.startDate || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            title="Filter end date"
            aria-label="Filter end date"
            value={localFilters.endDate || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Actor
          </label>
          <input
            type="text"
            value={localFilters.actor || ''}
            onChange={(e) => setLocalFilters({ ...localFilters, actor: e.target.value })}
            placeholder="User ID or email"
            title="Filter by actor"
            aria-label="Filter by actor"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mt-4 flex space-x-3">
        <button
          onClick={handleApplyFilters}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Apply Filters
        </button>
        <button
          onClick={handleClearFilters}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

function Pagination({ currentPage, totalPages }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-700">
        Page {currentPage} of {totalPages}
      </div>
      <div className="flex space-x-2">
        {currentPage > 1 && (
          <a
            href={`?page=${currentPage - 1}`}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Previous
          </a>
        )}
        
        {pages
          .filter(p => {
            // Show first, last, current, and adjacent pages
            return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
          })
          .map((page, index, filtered) => {
            const prevPage = filtered[index - 1];
            const showEllipsis = prevPage && page - prevPage > 1;

            return (
              <div key={page} className="flex items-center space-x-2">
                {showEllipsis && <span className="text-gray-400">...</span>}
                <a
                  href={`?page=${page}`}
                  className={`px-3 py-2 rounded-md transition-colors ${
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {page}
                </a>
              </div>
            );
          })}

        {currentPage < totalPages && (
          <a
            href={`?page=${currentPage + 1}`}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Next
          </a>
        )}
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
