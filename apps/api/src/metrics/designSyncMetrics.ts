// T088: Performance metrics instrumentation
// Feature: 006-design-sync-integration
// Track sync operations, drift detection, coverage analysis, browser test performance
// Spec References: FR-016 (observability), SC-002 (propagation timing)

/**
 * Centralized metrics for Design Sync operations
 * Tracks operation durations, success rates, error distributions
 */

export interface SyncOperationMetrics {
  operation: 'sync' | 'drift' | 'coverage' | 'browser_test' | 'notification' | 'credential';
  durationMs: number;
  status: 'success' | 'failure' | 'partial';
  timestamp: string;
  projectId?: string;
  environmentId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface DriftDetectionMetrics {
  durationMs: number;
  filesScanned: number;
  driftsDetected: number;
  falsePositives: number;
  timestamp: string;
  projectId: string;
  environmentId: string;
}

export interface CoverageAnalysisMetrics {
  durationMs: number;
  totalFiles: number;
  coveredFiles: number;
  coveragePct: number;
  timestamp: string;
  projectId: string;
  environmentId: string;
}

export interface BrowserTestMetrics {
  durationMs: number;
  sessionId: string;
  status: 'passed' | 'failed' | 'aborted';
  performanceSummary?: {
    lcp?: number;
    fid?: number;
    cls?: number;
    ttfb?: number;
  };
  timestamp: string;
  storyId: string;
}

export interface NotificationMetrics {
  durationMs: number;
  channel: 'slack' | 'email' | 'webhook';
  status: 'sent' | 'failed' | 'retrying';
  category: string;
  timestamp: string;
  userId?: string;
  projectId?: string;
}

/**
 * In-memory metrics storage (can be extended to write to time-series DB)
 */
class DesignSyncMetrics {
  private syncMetrics: SyncOperationMetrics[] = [];
  private driftMetrics: DriftDetectionMetrics[] = [];
  private coverageMetrics: CoverageAnalysisMetrics[] = [];
  private browserMetrics: BrowserTestMetrics[] = [];
  private notificationMetrics: NotificationMetrics[] = [];

  private readonly MAX_METRICS_PER_TYPE = 1000; // Prevent unbounded growth

  /**
   * Record sync operation metric
   */
  recordSync(metric: SyncOperationMetrics): void {
    this.syncMetrics.push(metric);
    this.pruneOldest(this.syncMetrics, this.MAX_METRICS_PER_TYPE);
  }

  /**
   * Record drift detection metric
   */
  recordDrift(metric: DriftDetectionMetrics): void {
    this.driftMetrics.push(metric);
    this.pruneOldest(this.driftMetrics, this.MAX_METRICS_PER_TYPE);
  }

  /**
   * Record coverage analysis metric
   */
  recordCoverage(metric: CoverageAnalysisMetrics): void {
    this.coverageMetrics.push(metric);
    this.pruneOldest(this.coverageMetrics, this.MAX_METRICS_PER_TYPE);
  }

  /**
   * Record browser test metric
   */
  recordBrowserTest(metric: BrowserTestMetrics): void {
    this.browserMetrics.push(metric);
    this.pruneOldest(this.browserMetrics, this.MAX_METRICS_PER_TYPE);
  }

  /**
   * Record notification metric
   */
  recordNotification(metric: NotificationMetrics): void {
    this.notificationMetrics.push(metric);
    this.pruneOldest(this.notificationMetrics, this.MAX_METRICS_PER_TYPE);
  }

  /**
   * Get aggregate sync metrics (last N minutes)
   */
  getSyncStats(windowMinutes: number = 60): {
    total: number;
    success: number;
    failure: number;
    partial: number;
    avgDurationMs: number;
    p95DurationMs: number;
  } {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const recent = this.syncMetrics.filter((m) => new Date(m.timestamp).getTime() > cutoff);

    const success = recent.filter((m) => m.status === 'success').length;
    const failure = recent.filter((m) => m.status === 'failure').length;
    const partial = recent.filter((m) => m.status === 'partial').length;

    const durations = recent.map((m) => m.durationMs).sort((a, b) => a - b);
    const avgDurationMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const p95DurationMs = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] || 0 : 0;

    return {
      total: recent.length,
      success,
      failure,
      partial,
      avgDurationMs,
      p95DurationMs,
    };
  }

  /**
   * Get drift detection stats
   */
  getDriftStats(windowMinutes: number = 60): {
    total: number;
    totalDrifts: number;
    totalFalsePositives: number;
    falsePositiveRate: number;
    avgDurationMs: number;
  } {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const recent = this.driftMetrics.filter((m) => new Date(m.timestamp).getTime() > cutoff);

    const totalDrifts = recent.reduce((sum, m) => sum + m.driftsDetected, 0);
    const totalFalsePositives = recent.reduce((sum, m) => sum + m.falsePositives, 0);
    const falsePositiveRate = totalDrifts > 0 ? totalFalsePositives / totalDrifts : 0;

    const durations = recent.map((m) => m.durationMs);
    const avgDurationMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      total: recent.length,
      totalDrifts,
      totalFalsePositives,
      falsePositiveRate,
      avgDurationMs,
    };
  }

  /**
   * Get coverage analysis stats
   */
  getCoverageStats(windowMinutes: number = 60): {
    total: number;
    avgCoveragePct: number;
    latestCoveragePct: number;
  } {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const recent = this.coverageMetrics.filter((m) => new Date(m.timestamp).getTime() > cutoff);

    const coverages = recent.map((m) => m.coveragePct);
    const avgCoveragePct = coverages.length > 0 ? coverages.reduce((a, b) => a + b, 0) / coverages.length : 0;
    const latestCoveragePct = coverages.length > 0 ? (coverages[coverages.length - 1] || 0) : 0;

    return {
      total: recent.length,
      avgCoveragePct,
      latestCoveragePct,
    };
  }

  /**
   * Get browser test stats
   */
  getBrowserTestStats(windowMinutes: number = 60): {
    total: number;
    passed: number;
    failed: number;
    aborted: number;
    passRate: number;
    avgDurationMs: number;
    avgLcp: number;
    avgFid: number;
    avgCls: number;
  } {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const recent = this.browserMetrics.filter((m) => new Date(m.timestamp).getTime() > cutoff);

    const passed = recent.filter((m) => m.status === 'passed').length;
    const failed = recent.filter((m) => m.status === 'failed').length;
    const aborted = recent.filter((m) => m.status === 'aborted').length;
    const passRate = recent.length > 0 ? passed / recent.length : 0;

    const durations = recent.map((m) => m.durationMs);
    const avgDurationMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    const lcpValues = recent.map((m) => m.performanceSummary?.lcp).filter((v): v is number => v !== undefined);
    const fidValues = recent.map((m) => m.performanceSummary?.fid).filter((v): v is number => v !== undefined);
    const clsValues = recent.map((m) => m.performanceSummary?.cls).filter((v): v is number => v !== undefined);

    const avgLcp = lcpValues.length > 0 ? lcpValues.reduce((a, b) => a + b, 0) / lcpValues.length : 0;
    const avgFid = fidValues.length > 0 ? fidValues.reduce((a, b) => a + b, 0) / fidValues.length : 0;
    const avgCls = clsValues.length > 0 ? clsValues.reduce((a, b) => a + b, 0) / clsValues.length : 0;

    return {
      total: recent.length,
      passed,
      failed,
      aborted,
      passRate,
      avgDurationMs,
      avgLcp,
      avgFid,
      avgCls,
    };
  }

  /**
   * Get notification stats
   */
  getNotificationStats(windowMinutes: number = 60): {
    total: number;
    sent: number;
    failed: number;
    retrying: number;
    successRate: number;
    byChannel: Record<string, number>;
  } {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const recent = this.notificationMetrics.filter((m) => new Date(m.timestamp).getTime() > cutoff);

    const sent = recent.filter((m) => m.status === 'sent').length;
    const failed = recent.filter((m) => m.status === 'failed').length;
    const retrying = recent.filter((m) => m.status === 'retrying').length;
    const successRate = recent.length > 0 ? sent / recent.length : 0;

    const byChannel: Record<string, number> = {};
    recent.forEach((m) => {
      byChannel[m.channel] = (byChannel[m.channel] || 0) + 1;
    });

    return {
      total: recent.length,
      sent,
      failed,
      retrying,
      successRate,
      byChannel,
    };
  }

  /**
   * Export all metrics (for monitoring dashboards)
   */
  exportAll(): {
    sync: SyncOperationMetrics[];
    drift: DriftDetectionMetrics[];
    coverage: CoverageAnalysisMetrics[];
    browserTest: BrowserTestMetrics[];
    notification: NotificationMetrics[];
  } {
    return {
      sync: [...this.syncMetrics],
      drift: [...this.driftMetrics],
      coverage: [...this.coverageMetrics],
      browserTest: [...this.browserMetrics],
      notification: [...this.notificationMetrics],
    };
  }

  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.syncMetrics = [];
    this.driftMetrics = [];
    this.coverageMetrics = [];
    this.browserMetrics = [];
    this.notificationMetrics = [];
  }

  /**
   * Prune oldest metrics to prevent unbounded growth
   */
  private pruneOldest<T>(metrics: T[], maxCount: number): void {
    if (metrics.length > maxCount) {
      metrics.splice(0, metrics.length - maxCount);
    }
  }
}

// Singleton instance
export const designSyncMetrics = new DesignSyncMetrics();
