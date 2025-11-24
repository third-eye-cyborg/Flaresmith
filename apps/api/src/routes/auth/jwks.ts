// T154: JWKS endpoint (serves active symmetric keys as oct entries)
import type { Context } from 'hono';
import { getJWKS } from '../../services/jwksService';

export async function jwksRoute(c: Context) {
  const master = c.env.MASTER_ENCRYPTION_KEY;
  const { keys, etag, maxAge } = await getJWKS(master);
  c.header('Cache-Control', `public, max-age=${maxAge}`);
  c.header('ETag', etag);
  return c.json({ keys });
}
