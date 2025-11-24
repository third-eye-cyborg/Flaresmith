// T154: JWT Key Rotation Script
// Usage: ts-node scripts/security/rotateJwtKey.ts --kid new-key-<timestamp>
import { parseArgs } from 'node:util';
import { getDb } from '../../apps/api/db/connection';
import { jwtKeys } from '../../apps/api/db/schema/secrets';
import { sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';

async function main() {
  const { values } = parseArgs({ options: { kid: { type: 'string' } } });
  const kid = values.kid || `key-${Date.now()}`;
  const master = process.env.MASTER_ENCRYPTION_KEY;
  if (!master) {
    console.error('MASTER_ENCRYPTION_KEY missing');
    process.exit(1);
  }
  const db = getDb();
  const secret = randomBytes(32).toString('hex');
  // Encrypt using pgcrypto pgp_sym_encrypt
  await db.execute(sql`UPDATE jwt_keys SET active = false WHERE active = true;`);
  await db.execute(sql`INSERT INTO jwt_keys (kid, encrypted_secret, algorithm, active) VALUES (${kid}, pgp_sym_encrypt(${secret}, ${master}), 'HS256', true);`);
  console.log(JSON.stringify({ rotated: true, kid }));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
