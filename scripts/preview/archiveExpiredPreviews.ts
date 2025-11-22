// Preview Archival Job (T161 / FR-034)
// Archives preview environments whose ttl_expires_at has passed.
// Invocation: ts-node scripts/preview/archiveExpiredPreviews.ts
// Logs number of archived environments and emits summary JSON.

import { sql } from 'drizzle-orm';
import { getDb } from '../../apps/api/db/connection';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const db = getDb(databaseUrl);
  // Select expired previews
  const expired: any = await db.execute(sql`SELECT id FROM environments WHERE kind = 'preview' AND ttl_expires_at IS NOT NULL AND ttl_expires_at <= NOW()`);
  const ids: string[] = expired.rows?.map((r: any) => r.id) || [];
  if (ids.length === 0) {
    console.log(JSON.stringify({ archived: 0 }));
    return;
  }
  // Archive them (set state archived) – assuming environments table has state column
  await db.execute(sql`UPDATE environments SET state = 'archived' WHERE id = ANY(${sql.array(ids)})`);
  console.log(JSON.stringify({ archived: ids.length }));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
