/**
 * T032: KV Adapter for rate limiting persistence (per-server quotas)
 * Provides simple JSON bucket storage on Cloudflare KV binding RATE_LIMIT_KV.
 */
export interface KvBucketState {
  tokens: number;
  lastRefill: number;
}

export class KvRateLimitAdapter {
  constructor(private kv: KVNamespace | undefined) {}

  private key(namespace: string, id: string) {
    return `rl:${namespace}:${id}`;
  }

  async get(namespace: string, id: string): Promise<KvBucketState | null> {
    if (!this.kv) return null;
    const raw = await this.kv.get(this.key(namespace, id));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as KvBucketState;
    } catch {
      return null;
    }
  }

  async set(namespace: string, id: string, state: KvBucketState): Promise<void> {
    if (!this.kv) return;
    await this.kv.put(this.key(namespace, id), JSON.stringify(state), { expirationTtl: 3600 });
  }
}
