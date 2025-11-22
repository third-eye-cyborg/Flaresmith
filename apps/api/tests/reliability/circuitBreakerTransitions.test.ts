import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { circuitBreakerRegistry, CircuitState } from '../../../../packages/utils/src/reliability/externalPolicy';

/**
 * T172: Circuit Breaker Transition Test (FR-032)
 * Verifies CLOSED → OPEN → HALF_OPEN → CLOSED lifecycle with success convergence.
 * Strategy:
 *  1. Create breaker with default thresholds (failureThreshold=10, halfOpenTimeout=30s, successThreshold=3)
 *  2. Induce 10 consecutive failures within the failure window => state OPEN
 *  3. Advance system time by halfOpenTimeout => state HALF_OPEN on next getState()
 *  4. Provide successive successes; ensure stays HALF_OPEN until successThreshold reached then transitions to CLOSED and metrics reset.
 */

describe('CircuitBreaker transitions (T172 FR-032)', () => {
  const breakerName = 'test-service-transition';

  beforeEach(() => {
    vi.useFakeTimers();
    // Ensure clean breaker state
    circuitBreakerRegistry.reset(breakerName);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cycles CLOSED → OPEN → HALF_OPEN → CLOSED', async () => {
    const breaker = circuitBreakerRegistry.getOrCreate(breakerName); // default config

    // Initial state should be CLOSED
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    // Induce failures up to threshold
    const failingFn = async () => { throw new Error('forced failure'); };
    for (let i = 0; i < 10; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow('forced failure');
    }

    // After 10 failures state should be OPEN
    expect(breaker.getState()).toBe(CircuitState.OPEN);
    const openTime = Date.now();

    // Advance time past halfOpenTimeout (30s) and trigger HALF_OPEN transition
    vi.setSystemTime(openTime + 30001); // 30s + 1ms
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    // Provide successes; should remain HALF_OPEN until successThreshold (3) reached
    const successFn = async () => 'ok';
    for (let i = 1; i <= 2; i++) {
      await expect(breaker.execute(successFn)).resolves.toBe('ok');
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    }

    // Third success closes the breaker
    await expect(breaker.execute(successFn)).resolves.toBe('ok');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    // Metrics reset expectations
    const metrics = breaker.getMetrics();
    expect(metrics.failures).toBe(0); // failures cleared on close
    expect(metrics.halfOpenAttempts).toBe(0); // attempts reset
    expect(metrics.halfOpenSuccesses).toBe(0); // successes reset
  });

  it('re-opens on failure during HALF_OPEN', async () => {
    const breaker = circuitBreakerRegistry.getOrCreate(breakerName);
    const failingFn = async () => { throw new Error('forced failure'); };
    // Trip to OPEN
    for (let i = 0; i < 10; i++) {
      await expect(breaker.execute(failingFn)).rejects.toThrow('forced failure');
    }
    expect(breaker.getState()).toBe(CircuitState.OPEN);
    const openTime = Date.now();
    vi.setSystemTime(openTime + 30001);
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

    // A failure in HALF_OPEN should revert to OPEN immediately
    await expect(breaker.execute(failingFn)).rejects.toThrow('forced failure');
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });
});
