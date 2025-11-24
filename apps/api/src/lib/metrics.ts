/**
 * T144: Reliability Metrics Module
 * In-memory counters & gauges (placeholder; future: OpenTelemetry exporter)
 */

type Counter = { value: number };
type Gauge = { value: number };
interface Histogram {
  buckets: number[]; // sorted upper bounds
  counts: number[]; // same length as buckets
  sum: number;
  count: number;
  // retain limited raw samples for percentile estimation in tests
  samples: number[];
  maxSamples: number;
}

const counters: Record<string, Counter> = {};
const gauges: Record<string, Gauge> = {};
const histograms: Record<string, Histogram> = {};

export function incrementCounter(name: string, by = 1, _labels?: Record<string, string | number>): void {
  if (!counters[name]) counters[name] = { value: 0 };
  counters[name].value += by;
}

export function setGauge(name: string, value: number): void {
  if (!gauges[name]) gauges[name] = { value };
  else gauges[name].value = value;
}

export function getMetricsSnapshot() {
  return {
    counters: Object.fromEntries(Object.entries(counters).map(([k, v]) => [k, v.value])),
    gauges: Object.fromEntries(Object.entries(gauges).map(([k, v]) => [k, v.value])),
    histograms: Object.fromEntries(Object.entries(histograms).map(([k, h]) => [k, { buckets: h.buckets, counts: h.counts, sum: h.sum, count: h.count }])),
    timestamp: new Date().toISOString(),
  };
}

// Export raw maps for introspection (read-only usage recommended)
export const _internalMetrics = { counters, gauges, histograms };

// Pre-declare known metric names
export const METRICS = {
  rateLimitHits: 'rate_limit_hits_total',
  rateLimitExceeded: 'rate_limit_exceeded_total',
  circuitBreakerOpen: 'circuit_breaker_open_total',
  circuitBreakerHalfOpen: 'circuit_breaker_half_open_total',
  healthCheckFailures: 'health_check_failures_total',
  healthCheckFailovers: 'health_check_failover_total',
  requestSlowTotal: 'request_slow_total',
  errorTotal: 'error_total',
  errorSampledTotal: 'error_sampled_total',
  keyRotationTotal: 'key_rotation_total',
  secretAccessTotal: 'secret_access_total',
  rateLimitOverheadMs: 'rate_limit_overhead_ms',
};

/**
 * Observe a value for a histogram metric. Histograms are lazily initialized with provided bucket boundaries.
 * @param name metric name
 * @param value observed value (ms)
 * @param buckets bucket upper bounds (must be sorted ascending)
 */
export function observeHistogram(name: string, value: number, buckets: number[] = [0.25,0.5,1,2,3,5,8,10]) {
  if (!histograms[name]) {
    histograms[name] = {
      buckets: buckets.slice().sort((a,b)=>a-b),
      counts: buckets.map(()=>0),
      sum: 0,
      count: 0,
      samples: [],
      maxSamples: 2000,
    };
  }
  const h = histograms[name];
  // find first bucket whose upper bound >= value
  for (let i=0; i<h.buckets.length; i++) {
    if (value <= h.buckets[i]) { h.counts[i]++; break; }
    if (i === h.buckets.length - 1) h.counts[i]++; // overflow into last bucket if larger
  }
  h.sum += value;
  h.count += 1;
  if (h.samples.length < h.maxSamples) h.samples.push(value);
}
