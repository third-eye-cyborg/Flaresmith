/**
 * T148: Metrics Catalog
 * Defines semantic metric descriptors (placeholder for OTEL integration)
 */

export interface MetricDescriptor {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  unit?: string;
  description: string;
}

export const METRIC_DESCRIPTORS: MetricDescriptor[] = [
  { name: 'rate_limit_hits_total', type: 'counter', description: 'Total successful rate-limited requests' },
  { name: 'rate_limit_exceeded_total', type: 'counter', description: 'Total requests rejected due to rate limit exhaustion' },
  { name: 'circuit_breaker_open_total', type: 'counter', description: 'Samples of circuit breakers in OPEN state' },
  { name: 'circuit_breaker_half_open_total', type: 'counter', description: 'Samples of circuit breakers in HALF_OPEN state' },
  { name: 'health_check_failures_total', type: 'counter', description: 'Number of health check failures recorded' },
  { name: 'health_check_failover_total', type: 'counter', description: 'Number of failover events triggered' },
  { name: 'http_request_duration_ms', type: 'histogram', unit: 'ms', description: 'Latency distribution of HTTP requests' },
  { name: 'request_slow_total', type: 'counter', description: 'Total number of requests exceeding slow threshold (500ms)' },
  { name: 'error_total', type: 'counter', description: 'Total number of errors processed by error handler' },
  { name: 'error_sampled_total', type: 'counter', description: 'Total number of errors selected for detailed sampling' },
  { name: 'key_rotation_total', type: 'counter', description: 'Total number of JWT key rotation events' },
  { name: 'secret_access_total', type: 'counter', description: 'Total secret access/audit events logged' },
  { name: 'rate_limit_overhead_ms', type: 'histogram', unit: 'ms', description: 'Middleware added latency (exclusive of handler) for rate limiting' },
];
