// JWKS Service (T159 / FR-036)
// Provides cached retrieval of active symmetric JWT signing keys from jwt_keys table.
// Adds lightweight in-memory caching + ETag generation and max-age hints.
import { sql } from 'drizzle-orm';
import { getDb } from '../../db/connection';

interface JwkOctKey {
  kty: 'oct';
  kid: string;
  k: string; // base64 key material
  alg: string; // HS256
  use: 'sig';
}

interface JWKSResult {
  keys: JwkOctKey[];
  etag: string;
  maxAge: number; // seconds
}

let cache: { value: JWKSResult; expiresAt: number } | null = null;
const CACHE_TTL_SECONDS = 30; // short-lived cache; rotation job invalidates naturally

function computeEtag(keys: JwkOctKey[]): string {
  const data = keys.map(k => `${k.kid}:${k.alg}:${k.k}`).join('|');
  // Simple hash (FNV-1a 32-bit)
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `W/"${hash.toString(16)}"`;
}

export async function getJWKS(masterKey: string | undefined): Promise<JWKSResult> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;
  if (!masterKey) {
    const empty: JWKSResult = { keys: [], etag: 'W/"empty"', maxAge: CACHE_TTL_SECONDS };
    cache = { value: empty, expiresAt: now + CACHE_TTL_SECONDS * 1000 };
    return empty;
  }
  const db = getDb();
  const rows = await db.execute(sql`SELECT kid, pgp_sym_decrypt(encrypted_secret, ${masterKey}) as secret, algorithm FROM jwt_keys WHERE active = true`);
  const keys: JwkOctKey[] = rows.rows.map((r: any) => ({
    kty: 'oct',
    kid: r.kid,
    k: Buffer.from(r.secret, 'utf-8').toString('base64'),
    alg: r.algorithm,
    use: 'sig'
  }));
  const etag = computeEtag(keys);
  const result: JWKSResult = { keys, etag, maxAge: CACHE_TTL_SECONDS };
  cache = { value: result, expiresAt: now + CACHE_TTL_SECONDS * 1000 };
  return result;
}

export function invalidateJWKSCache() {
  cache = null;
}
