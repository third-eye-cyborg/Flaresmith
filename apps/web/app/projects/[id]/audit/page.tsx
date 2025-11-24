/**
 * T073: Audit Log Viewer Page
 * Filterable audit log table for secret sync events with pagination
 */

import { Suspense } from 'react';
import { AuditLogTable } from '../../../../src/components/projects/AuditLogTable';

interface AuditPageProps {
  params: {
    id: string;
  };
  searchParams: {
    page?: string;
    operationType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    actor?: string;
  };
}

export default function AuditPage({ params, searchParams }: AuditPageProps) {
  const projectId = params.id;
  const currentPage = parseInt(searchParams.page || '1', 10);
  const filters = {
    operationType: searchParams.operationType,
    status: searchParams.status,
    startDate: searchParams.startDate,
    endDate: searchParams.endDate,
    actor: searchParams.actor
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Log</h1>
        <p className="text-gray-600">
          View and filter secret synchronization events for this project
        </p>
      </div>

      <Suspense fallback={<AuditLogSkeleton />}>
        <AuditLogTable 
          projectId={projectId} 
          currentPage={currentPage}
          filters={filters}
        />
      </Suspense>
    </div>
  );
}

function AuditLogSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-12 bg-gray-200 rounded"></div>
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded"></div>
        ))}
      </div>
    </div>
  );
}
