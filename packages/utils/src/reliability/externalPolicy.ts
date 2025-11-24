/**
 * Retry & Backoff Module
 * 
 * Per FR-032: Exponential backoff with full jitter (100ms→1600ms, 5 attempts)
 * Implements retry logic for external API calls with circuit breaker integration
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFull: boolean;
  retryableStatuses?: number[];
  retryableErrors?: string[];
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 100,
  maxDelayMs: 1600,
  jitterFull: true,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'],
};

export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'RetryableError';
  }
}

/**
 * Calculate exponential backoff delay with full jitter
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  const exponentialDelay = Math.min(
    config.baseDelayMs * Math.pow(2, attempt),
    config.maxDelayMs
  );

  if (config.jitterFull) {
    // Full jitter: random value between 0 and exponentialDelay
    return Math.floor(Math.random() * exponentialDelay);
  }

  return exponentialDelay;
}

/**
 * Determine if an error is retryable
 */
function isRetryable(error: any, config: RetryConfig): boolean {
  // Check HTTP status codes
  if (error.statusCode && config.retryableStatuses) {
    if (config.retryableStatuses.includes(error.statusCode)) {
      return true;
    }
  }

  // Check error codes
  if (error.code && config.retryableErrors) {
    if (config.retryableErrors.includes(error.code)) {
      return true;
    }
  }

  // Check error message
  if (error instanceof RetryableError) {
    return true;
  }

  return false;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: Error, delayMs: number) => void
): Promise<T> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < fullConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if error is not retryable
      if (!isRetryable(error, fullConfig)) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === fullConfig.maxAttempts - 1) {
        throw lastError;
      }

      // Calculate backoff delay
      const delayMs = calculateBackoff(attempt, fullConfig);

      // Notify callback
      if (onRetry) {
        onRetry(attempt + 1, lastError, delayMs);
      }

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Circuit breaker state
 */
export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, reject requests immediately
  HALF_OPEN = 'half_open', // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  failureWindow: number;          // Time window for counting failures (ms)
  halfOpenTimeout: number;        // Time to wait before trying half-open (ms)
  successThreshold: number;       // Successes needed in half-open to close
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 10,
  failureWindow: 60000,     // 60 seconds
  halfOpenTimeout: 30000,    // 30 seconds
  successThreshold: 3,
};

/**
 * Circuit breaker for external service calls
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = []; // Timestamps of failures
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;
  private halfOpenSuccesses: number = 0;
  private config: CircuitBreakerConfig;

  constructor(
    public readonly name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }

  getState(): CircuitState {
    this.updateState();
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failures: this.failures.length,
      lastFailureTime: this.lastFailureTime,
      halfOpenAttempts: this.halfOpenAttempts,
      halfOpenSuccesses: this.halfOpenSuccesses,
    };
  }

  private updateState(): void {
    const now = Date.now();

    // Clean up old failures outside the window
    this.failures = this.failures.filter(
      timestamp => now - timestamp < this.config.failureWindow
    );

    // Check if we should transition from OPEN to HALF_OPEN
    if (
      this.state === CircuitState.OPEN &&
      now - this.lastFailureTime >= this.config.halfOpenTimeout
    ) {
      this.state = CircuitState.HALF_OPEN;
      this.halfOpenAttempts = 0;
      this.halfOpenSuccesses = 0;
    }

    // Check if we should transition from CLOSED to OPEN
    if (
      this.state === CircuitState.CLOSED &&
      this.failures.length >= this.config.failureThreshold
    ) {
      this.state = CircuitState.OPEN;
      this.lastFailureTime = now;
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.updateState();

    // Reject immediately if circuit is open
    if (this.state === CircuitState.OPEN) {
      throw new Error(`Circuit breaker ${this.name} is OPEN`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccesses++;
      this.halfOpenAttempts++;

      // Close circuit if enough successes
      if (this.halfOpenSuccesses >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failures = [];
        this.halfOpenAttempts = 0;
        this.halfOpenSuccesses = 0;
      }
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed in half-open, go back to open
      this.state = CircuitState.OPEN;
      this.halfOpenAttempts = 0;
      this.halfOpenSuccesses = 0;
    }

    this.updateState();
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.lastFailureTime = 0;
    this.halfOpenAttempts = 0;
    this.halfOpenSuccesses = 0;
  }
}

/**
 * Circuit breaker registry for different services
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  getOrCreate(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  getAll(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  reset(name: string): void {
    this.breakers.get(name)?.reset();
  }

  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();
