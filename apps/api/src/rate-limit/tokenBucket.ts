import { KvRateLimitAdapter, KvBucketState } from "./kvAdapter";

/**
 * T033: Token Bucket service (per FR-074 / SC-030)
 * Supports dynamic refill & cost consumption backed by KV for horizontal scalability.
 */
export interface TokenBucketConfig {
  capacity: number; // max burst tokens
  refillRatePerSec: number; // steady state refill
}

export class TokenBucketService {
  constructor(private adapter: KvRateLimitAdapter, private config: TokenBucketConfig) {}

  private now() {
    return Date.now();
  }

  private refill(state: KvBucketState): KvBucketState {
    const now = this.now();
    const elapsed = (now - state.lastRefill) / 1000;
    const refillAmount = elapsed * this.config.refillRatePerSec;
    const tokens = Math.min(this.config.capacity, state.tokens + refillAmount);
    return { tokens, lastRefill: now };
  }

  async consume(namespace: string, id: string, cost = 1): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds?: number }> {
    let state = (await this.adapter.get(namespace, id)) || { tokens: this.config.capacity, lastRefill: this.now() };
    state = this.refill(state);
    if (state.tokens >= cost) {
      state.tokens -= cost;
      await this.adapter.set(namespace, id, state);
      return { allowed: true, remaining: Math.floor(state.tokens) };
    }
    const deficit = cost - state.tokens;
    const retryAfterSeconds = Math.ceil(deficit / this.config.refillRatePerSec);
    await this.adapter.set(namespace, id, state); // Persist updated lastRefill even on rejection
    return { allowed: false, remaining: Math.floor(state.tokens), retryAfterSeconds };
  }
}
