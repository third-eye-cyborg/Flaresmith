// Preview Metrics Updater (T162 / FR-035)
// Updates preview_env_active_total gauge based on current active previews.
import { sql } from 'drizzle-orm';
import { getDb } from '../../apps/api/db/connection';
import { setGauge, METRICS } from '../lib/metrics';

export async function updatePreviewMetrics(projectId?: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;
  const db = getDb(databaseUrl);
  let query = sql`SELECT COUNT(*)::int AS count FROM environments WHERE kind = 'preview' AND (ttl_expires_at IS NULL OR ttl_expires_at > NOW())`;
  if (projectId) {
    query = sql`SELECT COUNT(*)::int AS count FROM environments WHERE project_id = ${projectId} AND kind = 'preview' AND (ttl_expires_at IS NULL OR ttl_expires_at > NOW())`;
  }
  const rows: any = await db.execute(query);
  const rawCount = rows?.[0]?.count ?? rows?.rows?.[0]?.count;
  const count = typeof rawCount === 'number' ? rawCount : parseInt(rawCount || '0', 10) || 0;
  setGauge(METRICS.previewEnvActiveTotal, count);
}
