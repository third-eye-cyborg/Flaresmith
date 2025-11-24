import { Octokit } from "@octokit/rest";

/**
 * T011: Base service class with retry logic (exponential backoff, max 3 attempts, jitter)
 * Source: specs/002-github-secrets-sync/research.md (D-005)
 */

export interface RetryConfig {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export class BaseGitHubService {
  protected octokit: Octokit;
  protected retryConfig: Required<RetryConfig>;

  constructor(octokit: Octokit, retryConfig?: RetryConfig) {
    this.octokit = octokit;
    this.retryConfig = {
      maxAttempts: retryConfig?.maxAttempts ?? 3,
      baseDelayMs: retryConfig?.baseDelayMs ?? 1000,
      maxDelayMs: retryConfig?.maxDelayMs ?? 32000,
    };
  }

  /**
   * Execute operation with exponential backoff retry
   * Retries on 5xx errors, 429 rate limits, and network timeouts
   * Does NOT retry on 4xx client errors (except 429)
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Don't retry on client errors (except rate limits)
        if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxAttempts) {
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, error);

        console.warn({
          message: "Retrying GitHub API operation after error",
          context,
          attempt,
          maxAttempts: this.retryConfig.maxAttempts,
          delayMs: delay,
          error: error.message,
          status: error.status,
        });

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // Should never reach here, but TypeScript needs this
    throw lastError || new Error("Retry failed without error");
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * For 429 rate limits, respects Retry-After header
   */
  private calculateDelay(attempt: number, error?: any): number {
    // If rate limited, use Retry-After header if present
    if (error?.status === 429 && error?.response?.headers?.["retry-after"]) {
      const retryAfter = parseInt(error.response.headers["retry-after"], 10);
      if (!isNaN(retryAfter)) {
        return retryAfter * 1000; // Convert seconds to milliseconds
      }
    }

    // Exponential backoff: baseDelay * (2 ^ attempt)
    const exponentialDelay = this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1);

    // Cap at maxDelay
    const cappedDelay = Math.min(exponentialDelay, this.retryConfig.maxDelayMs);

    // Add jitter (random 0-1000ms) to prevent thundering herd
    const jitter = Math.random() * 1000;

    return cappedDelay + jitter;
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   */
  protected isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
      return true;
    }

    // Server errors (5xx)
    if (error.status && error.status >= 500) {
      return true;
    }

    // Rate limit (429)
    if (error.status === 429) {
      return true;
    }

    return false;
  }
}
