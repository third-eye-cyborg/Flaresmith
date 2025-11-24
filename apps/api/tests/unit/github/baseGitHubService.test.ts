/**
 * T068: Unit tests for retry logic with exponential backoff and jitter
 * Tests BaseGitHubService retry behavior
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BaseGitHubService } from '../../../src/services/github/baseGitHubService';

class TestGitHubService extends BaseGitHubService {
  public async testRetryableOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    return this.withRetry(operation, operationName);
  }
}

describe('BaseGitHubService - Retry Logic', () => {
  let service: TestGitHubService;

  beforeEach(() => {
    service = new TestGitHubService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Exponential backoff', () => {
    it('should succeed on first attempt if no error', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await service.testRetryableOperation(operation, 'test-op');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry once after first failure', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce('success');

      const promise = service.testRetryableOperation(operation, 'test-op');
      
      // Advance through retry delay (base 1s + jitter)
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry up to 3 times before failing', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'));

      const promise = service.testRetryableOperation(operation, 'test-op');

      // Advance through all retry delays
      // Attempt 1: immediate
      // Attempt 2: ~1s delay
      // Attempt 3: ~2s delay
      // Attempt 4: ~4s delay (3 retries = 4 total attempts)
      await vi.advanceTimersByTimeAsync(10000);

      await expect(promise).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should use exponential backoff delays', async () => {
      const delays: number[] = [];
      const operation = vi.fn().mockRejectedValue(new Error('Fail'));

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = ((callback: any, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(callback, delay);
      }) as any;

      const promise = service.testRetryableOperation(operation, 'test-op');
      await vi.advanceTimersByTimeAsync(40000);

      await expect(promise).rejects.toThrow();

      // Verify exponential pattern: base * 2^attempt
      // Delay 1: ~1000ms (2^0 * 1000)
      // Delay 2: ~2000ms (2^1 * 1000)
      // Delay 3: ~4000ms (2^2 * 1000)
      expect(delays.length).toBe(3);
      expect(delays[0]).toBeGreaterThanOrEqual(1000);
      expect(delays[0]).toBeLessThan(2000); // With jitter
      expect(delays[1]).toBeGreaterThanOrEqual(2000);
      expect(delays[1]).toBeLessThan(3000);
      expect(delays[2]).toBeGreaterThanOrEqual(4000);
      expect(delays[2]).toBeLessThan(5000);

      global.setTimeout = originalSetTimeout;
    });

    it('should respect max delay of 32 seconds', async () => {
      const delays: number[] = [];
      const operation = vi.fn().mockRejectedValue(new Error('Fail'));

      const originalSetTimeout = global.setTimeout;
      global.setTimeout = ((callback: any, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(callback, delay);
      }) as any;

      const promise = service.testRetryableOperation(operation, 'test-op');
      await vi.advanceTimersByTimeAsync(100000);

      await expect(promise).rejects.toThrow();

      // All delays should be <= 32000ms (plus jitter up to 1000ms)
      delays.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(33000);
      });

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Jitter', () => {
    it('should add random jitter to prevent thundering herd', async () => {
      const delays: number[] = [];
      const operation = vi.fn().mockRejectedValue(new Error('Fail'));

      const originalSetTimeout = global.setTimeout;
      global.setTimeout = ((callback: any, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(callback, delay);
      }) as any;

      // Run multiple retry attempts
      const promise = service.testRetryableOperation(operation, 'test-op');
      await vi.advanceTimersByTimeAsync(10000);
      await expect(promise).rejects.toThrow();

      // Delays should vary due to jitter (not exact multiples)
      expect(delays.length).toBeGreaterThan(0);
      delays.forEach(delay => {
        const isExactPowerOfTwo = [1000, 2000, 4000, 8000].includes(delay);
        expect(isExactPowerOfTwo).toBe(false); // Should have jitter added
      });

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Retry conditions', () => {
    it('should retry on 5xx server errors', async () => {
      const error = new Error('Internal Server Error');
      (error as any).status = 500;

      const operation = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const promise = service.testRetryableOperation(operation, 'test-op');
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 rate limit errors', async () => {
      const error = new Error('Rate limit exceeded');
      (error as any).status = 429;

      const operation = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const promise = service.testRetryableOperation(operation, 'test-op');
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should NOT retry on 4xx client errors (except 429)', async () => {
      const error = new Error('Bad Request');
      (error as any).status = 400;

      const operation = vi.fn().mockRejectedValue(error);

      const promise = service.testRetryableOperation(operation, 'test-op');
      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).rejects.toThrow('Bad Request');
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should NOT retry on 404 Not Found', async () => {
      const error = new Error('Not Found');
      (error as any).status = 404;

      const operation = vi.fn().mockRejectedValue(error);

      await expect(
        service.testRetryableOperation(operation, 'test-op')
      ).rejects.toThrow('Not Found');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on network timeouts', async () => {
      const error = new Error('ETIMEDOUT');
      (error as any).code = 'ETIMEDOUT';

      const operation = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const promise = service.testRetryableOperation(operation, 'test-op');
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;
      expect(result).toBe('success');
    });

    it('should retry on connection refused', async () => {
      const error = new Error('ECONNREFUSED');
      (error as any).code = 'ECONNREFUSED';

      const operation = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const promise = service.testRetryableOperation(operation, 'test-op');
      await vi.advanceTimersByTimeAsync(2000);

      const result = await promise;
      expect(result).toBe('success');
    });
  });

  describe('Rate limit with Retry-After header', () => {
    it('should respect Retry-After header value', async () => {
      const error = new Error('Rate limit exceeded');
      (error as any).status = 429;
      (error as any).response = {
        headers: {
          'retry-after': '60' // Wait 60 seconds
        }
      };

      let delayUsed = 0;
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = ((callback: any, delay: number) => {
        delayUsed = delay;
        return originalSetTimeout(callback, delay);
      }) as any;

      const operation = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const promise = service.testRetryableOperation(operation, 'test-op');
      await vi.advanceTimersByTimeAsync(65000);

      await promise;

      // Should use Retry-After value (60000ms) instead of exponential backoff
      expect(delayUsed).toBeGreaterThanOrEqual(60000);

      global.setTimeout = originalSetTimeout;
    });
  });

  describe('Logging and observability', () => {
    it('should log retry attempts', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockResolvedValueOnce('success');

      const promise = service.testRetryableOperation(operation, 'test-op');
      await vi.advanceTimersByTimeAsync(2000);

      await promise;

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should include operation name in logs', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const operation = vi.fn().mockRejectedValue(new Error('Persistent'));

      const promise = service.testRetryableOperation(operation, 'fetchSecrets');
      await vi.advanceTimersByTimeAsync(10000);

      await expect(promise).rejects.toThrow();

      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(logCalls).toContain('fetchSecrets');

      consoleSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('should handle synchronous errors', async () => {
      const operation = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      await expect(
        service.testRetryableOperation(operation, 'test-op')
      ).rejects.toThrow('Sync error');
    });

    it('should handle undefined errors', async () => {
      const operation = vi.fn().mockRejectedValue(undefined);

      await expect(
        service.testRetryableOperation(operation, 'test-op')
      ).rejects.toBeUndefined();
    });

    it('should handle retry success after multiple failures', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const promise = service.testRetryableOperation(operation, 'test-op');
      await vi.advanceTimersByTimeAsync(10000);

      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });
});
