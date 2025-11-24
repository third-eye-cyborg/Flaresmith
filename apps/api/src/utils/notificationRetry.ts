// T091: Notification retry helper
// Feature: 006-design-sync-integration
// Exponential backoff retry for notification dispatch failures
// Spec References: FR-016 (notifications)

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number; // 0-1, adds randomness to delay
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  attempts: number;
  totalDurationMs: number;
  errors: Error[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.2,
};

/**
 * Retry a notification dispatch operation with exponential backoff
 */
export async function retryNotification<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const errors: Error[] = [];
  const startTime = Date.now();

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      const result = await operation();
      return {
        success: true,
        result,
        attempts: attempt,
        totalDurationMs: Date.now() - startTime,
        errors,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));

      // If last attempt, give up
      if (attempt === finalConfig.maxAttempts) {
        return {
          success: false,
          attempts: attempt,
          totalDurationMs: Date.now() - startTime,
          errors,
        };
      }

      // Calculate exponential backoff delay
      const exponentialDelay = Math.min(
        finalConfig.baseDelayMs * Math.pow(2, attempt - 1),
        finalConfig.maxDelayMs
      );

      // Add jitter
      const jitter = exponentialDelay * finalConfig.jitterFactor * (Math.random() - 0.5);
      const delayMs = Math.max(0, exponentialDelay + jitter);

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Should not reach here
  return {
    success: false,
    attempts: finalConfig.maxAttempts,
    totalDurationMs: Date.now() - startTime,
    errors,
  };
}
