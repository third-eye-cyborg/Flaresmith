import React from 'react';

async function fetchJSON(path: string) {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default async function MetricsPage() {
  // Placeholder endpoints (would be implemented server-side)
  const tokens = await fetchJSON(process.env.NEXT_PUBLIC_API_BASE + '/design/tokens');
  const latestAudit = await fetchJSON(process.env.NEXT_PUBLIC_API_BASE + '/design/audits/latest?mode=light');
  const drift = await fetchJSON(process.env.NEXT_PUBLIC_API_BASE + '/design/drift');

  const version = tokens?.version;
  const auditPass = latestAudit?.passedPct;
  const hasDrift = drift?.hasDrift;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Design System Metrics</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Active Token Version" value={version ?? '—'} description="Current merged version" />
        <MetricCard title="Accessibility Pass %" value={auditPass !== undefined ? auditPass + '%' : '—'} description="WCAG AA compliance" />
        <MetricCard title="Drift Status" value={hasDrift ? 'Drift Detected' : 'Clean'} description="Baseline divergence" />
      </div>
      <section>
        <h2 className="text-xl font-medium mb-2">Raw Data (Debug)</h2>
        <pre className="text-xs bg-neutral-100 dark:bg-neutral-800 p-4 rounded overflow-auto max-h-96">
{JSON.stringify({ tokens, latestAudit, drift }, null, 2)}
        </pre>
      </section>
    </div>
  );
}

function MetricCard({ title, value, description }: { title: string; value: React.ReactNode; description: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 bg-white dark:bg-neutral-900 shadow-sm">
      <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{title}</h3>
      <div className="mt-2 text-lg font-semibold">{value}</div>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
    </div>
  );
}
