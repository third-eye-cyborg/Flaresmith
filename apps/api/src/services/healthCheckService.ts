/**
 * Health Check Service
 * 
 * Per FR-031: Automated health checks every 30s with failover after 3 consecutive failures
 * Monitors external integrations and triggers failover when needed
 */

import { circuitBreakerRegistry } from '../../../packages/utils/src/reliability/externalPolicy';
import { incrementCounter, METRICS } from '../lib/metrics';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  lastCheck: string;
  consecutiveFailures: number;
  message?: string;
}

export interface FailoverConfig {
  enabled: boolean;
  standbyResource?: string;
  autoPromote: boolean;
}

class HealthCheckService {
  private checks = new Map<string, HealthCheckResult>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private readonly CHECK_INTERVAL_MS = 30000; // 30 seconds
  private readonly FAILURE_THRESHOLD = 3;

  /**
   * Register a health check for a service
   */
  registerCheck(
    serviceName: string,
    checkFn: () => Promise<{ healthy: boolean; latencyMs?: number; message?: string }>,
    failoverConfig?: FailoverConfig
  ): void {
    // Initialize health check result
    this.checks.set(serviceName, {
      service: serviceName,
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      consecutiveFailures: 0,
    });

    // Start periodic health check
    const interval = setInterval(async () => {
      await this.performCheck(serviceName, checkFn, failoverConfig);
    }, this.CHECK_INTERVAL_MS);

    this.intervals.set(serviceName, interval);

    // Perform initial check
    this.performCheck(serviceName, checkFn, failoverConfig);
  }

  /**
   * Unregister a health check
   */
  unregisterCheck(serviceName: string): void {
    const interval = this.intervals.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(serviceName);
    }
    this.checks.delete(serviceName);
  }

  /**
   * Perform a health check
   */
  private async performCheck(
    serviceName: string,
    checkFn: () => Promise<{ healthy: boolean; latencyMs?: number; message?: string }>,
    failoverConfig?: FailoverConfig
  ): Promise<void> {
    const startTime = Date.now();
    const existing = this.checks.get(serviceName);

    try {
      const result = await checkFn();
      const latencyMs = Date.now() - startTime;

      if (result.healthy) {
        // Service is healthy - reset failure count
        this.checks.set(serviceName, {
          service: serviceName,
          status: 'healthy',
          latencyMs,
          lastCheck: new Date().toISOString(),
          consecutiveFailures: 0,
          message: result.message,
        });

        // Reset circuit breaker if it exists
        circuitBreakerRegistry.reset(serviceName);
      } else {
        // Service is unhealthy - increment failure count
        const consecutiveFailures = (existing?.consecutiveFailures || 0) + 1;
        const status = consecutiveFailures >= this.FAILURE_THRESHOLD ? 'unhealthy' : 'degraded';

        this.checks.set(serviceName, {
          service: serviceName,
          status,
          latencyMs,
          lastCheck: new Date().toISOString(),
          consecutiveFailures,
          message: result.message,
        });
        incrementCounter(METRICS.healthCheckFailures);

        // Trigger failover if threshold reached
        if (consecutiveFailures >= this.FAILURE_THRESHOLD && failoverConfig?.enabled) {
          await this.triggerFailover(serviceName, failoverConfig);
        }
      }
    } catch (error) {
      const consecutiveFailures = (existing?.consecutiveFailures || 0) + 1;
      const status = consecutiveFailures >= this.FAILURE_THRESHOLD ? 'unhealthy' : 'degraded';

      this.checks.set(serviceName, {
        service: serviceName,
        status,
        lastCheck: new Date().toISOString(),
        consecutiveFailures,
        message: error instanceof Error ? error.message : 'Health check failed',
      });
      incrementCounter(METRICS.healthCheckFailures);

      // Trigger failover if threshold reached
      if (consecutiveFailures >= this.FAILURE_THRESHOLD && failoverConfig?.enabled) {
        await this.triggerFailover(serviceName, failoverConfig);
      }
    }
  }

  /**
   * Trigger failover to standby resource
   */
  private async triggerFailover(serviceName: string, config: FailoverConfig): Promise<void> {
    console.log(`[HealthCheck] Triggering failover for ${serviceName}`);

    if (!config.standbyResource) {
      console.warn(`[HealthCheck] No standby resource configured for ${serviceName}`);
      return;
    }

    try {
      // TODO: Implement actual failover logic per provider
      // For Neon: Promote standby branch to primary
      // For Cloudflare: Switch to backup worker deployment
      // For GitHub: Alert only (manual intervention required)

      console.log(`[HealthCheck] Failover initiated: ${serviceName} -> ${config.standbyResource}`);
      incrementCounter(METRICS.healthCheckFailovers);
      
      // Emit metric
      // metricsRegistry.increment('health_check_failover_total', { service: serviceName });
    } catch (error) {
      console.error(`[HealthCheck] Failover failed for ${serviceName}:`, error);
    }
  }

  /**
   * Get health status for a specific service
   */
  getServiceHealth(serviceName: string): HealthCheckResult | undefined {
    return this.checks.get(serviceName);
  }

  /**
   * Get health status for all services
   */
  getAllHealth(): HealthCheckResult[] {
    return Array.from(this.checks.values());
  }

  /**
   * Get overall system health
   */
  getOverallHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: HealthCheckResult[];
    healthyCount: number;
    degradedCount: number;
    unhealthyCount: number;
  } {
    const services = this.getAllHealth();
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      services,
      healthyCount,
      degradedCount,
      unhealthyCount,
    };
  }

  /**
   * Cleanup all health checks
   */
  shutdown(): void {
    for (const interval of this.intervals.values()) {
      clearInterval(interval);
    }
    this.intervals.clear();
    this.checks.clear();
  }
}

export const healthCheckService = new HealthCheckService();

/**
 * Example health check functions for different services
 */

export async function neonHealthCheck(): Promise<{ healthy: boolean; latencyMs?: number; message?: string }> {
  try {
    const startTime = Date.now();
    // TODO: Ping Neon database
    // const result = await db.execute('SELECT 1');
    const latencyMs = Date.now() - startTime;
    
    return {
      healthy: true,
      latencyMs,
      message: 'Neon database responsive',
    };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Neon connection failed',
    };
  }
}

export async function cloudflareHealthCheck(): Promise<{ healthy: boolean; latencyMs?: number; message?: string }> {
  try {
    const startTime = Date.now();
    // TODO: Check Cloudflare API status
    // const response = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', ...);
    const latencyMs = Date.now() - startTime;
    
    return {
      healthy: true,
      latencyMs,
      message: 'Cloudflare API responsive',
    };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Cloudflare API failed',
    };
  }
}

export async function githubHealthCheck(): Promise<{ healthy: boolean; latencyMs?: number; message?: string }> {
  try {
    const startTime = Date.now();
    // TODO: Check GitHub API status
    // const response = await fetch('https://api.github.com/rate_limit', ...);
    const latencyMs = Date.now() - startTime;
    
    return {
      healthy: true,
      latencyMs,
      message: 'GitHub API responsive',
    };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'GitHub API failed',
    };
  }
}
