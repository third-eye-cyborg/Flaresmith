/**
 * Graceful Degradation Service (T113)
 *
 * Detects persistent MCP outages via circuit breaker state monitoring and
 * provides fallback guidance for direct API usage when MCP servers unavailable.
 *
 * Success Criteria:
 *  - SC-016: Resilience (graceful degradation for unavailable MCP servers)
 *  - FR-077: MCP operations performance tracking
 *
 * Degradation Strategy:
 *  - Monitor circuit breaker states for all registered MCP servers
 *  - If server OPEN for >threshold duration, mark degraded
 *  - Return alternative direct API endpoints + credentials guidance
 *  - Emit degradation events for observability
 */

import { circuitBreakerRegistry, CircuitState } from '@flaresmith/utils';

export interface MCPServerStatus {
  serverName: string;
  state: CircuitState;
  degraded: boolean;
  lastFailureTime?: number;
  failureCount: number;
  fallbackGuidance?: FallbackGuidance;
}

export interface FallbackGuidance {
  message: string;
  directApiEndpoint?: string;
  credentialsRequired?: string[];
  documentationUrl?: string;
  estimatedRecovery?: string;
}

export interface DegradationSnapshot {
  timestamp: string;
  degradedServers: MCPServerStatus[];
  healthyServers: string[];
  totalServers: number;
  degradationRatePct: number;
}

// Threshold: server open for >90s = degraded
const DEGRADATION_THRESHOLD_MS = 90000;

// Fallback guidance per MCP server
const FALLBACK_MAP: Record<string, Omit<FallbackGuidance, 'message'>> = {
  polar: {
    directApiEndpoint: 'https://api.polar.sh/v1',
    credentialsRequired: ['POLAR_API_KEY'],
    documentationUrl: 'https://docs.polar.sh/api',
    estimatedRecovery: 'Retry in 5 minutes',
  },
  'better-auth': {
    directApiEndpoint: 'https://your-app.com/api/auth',
    credentialsRequired: ['JWT_SIGNING_KEY'],
    documentationUrl: 'https://better-auth.com/docs',
    estimatedRecovery: 'Check auth service logs',
  },
  neon: {
    directApiEndpoint: 'https://console.neon.tech/api/v2',
    credentialsRequired: ['NEON_API_KEY'],
    documentationUrl: 'https://neon.tech/docs/reference/api-reference',
    estimatedRecovery: 'Verify database availability',
  },
  cloudflare: {
    directApiEndpoint: 'https://api.cloudflare.com/client/v4',
    credentialsRequired: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'],
    documentationUrl: 'https://developers.cloudflare.com/api',
    estimatedRecovery: 'Check Cloudflare status page',
  },
  github: {
    directApiEndpoint: 'https://api.github.com',
    credentialsRequired: ['GITHUB_TOKEN'],
    documentationUrl: 'https://docs.github.com/rest',
    estimatedRecovery: 'Check GitHub status',
  },
  postman: {
    directApiEndpoint: 'https://api.getpostman.com',
    credentialsRequired: ['POSTMAN_API_KEY'],
    documentationUrl: 'https://learning.postman.com/docs/developer/intro-api/',
    estimatedRecovery: 'Verify API key scopes',
  },
  mapbox: {
    directApiEndpoint: 'https://api.mapbox.com',
    credentialsRequired: ['MAPBOX_ACCESS_TOKEN'],
    documentationUrl: 'https://docs.mapbox.com/api',
    estimatedRecovery: 'Check token validity',
  },
  onesignal: {
    directApiEndpoint: 'https://onesignal.com/api/v1',
    credentialsRequired: ['ONESIGNAL_APP_ID', 'ONESIGNAL_API_KEY'],
    documentationUrl: 'https://documentation.onesignal.com/reference',
    estimatedRecovery: 'Verify app configuration',
  },
  posthog: {
    directApiEndpoint: 'https://app.posthog.com/api',
    credentialsRequired: ['POSTHOG_API_KEY'],
    documentationUrl: 'https://posthog.com/docs/api',
    estimatedRecovery: 'Check project settings',
  },
};

export class GracefulDegradationService {
  /**
   * Analyze all circuit breaker states and identify degraded servers
   */
  getServerStatuses(): MCPServerStatus[] {
    const breakers = circuitBreakerRegistry.getAll();
    const now = Date.now();
    const statuses: MCPServerStatus[] = [];

    for (const [name, breaker] of breakers) {
      const metrics = breaker.getMetrics();
      const isDegraded =
        metrics.state === CircuitState.OPEN &&
        metrics.lastFailureTime > 0 &&
        now - metrics.lastFailureTime >= DEGRADATION_THRESHOLD_MS;

      const fallbackTemplate = FALLBACK_MAP[name];
      const fallbackGuidance: FallbackGuidance | undefined = isDegraded && fallbackTemplate
        ? {
            message: `MCP server "${name}" is unavailable. Use direct API as fallback.`,
            ...fallbackTemplate,
          }
        : undefined;

      const status: MCPServerStatus = {
        serverName: name,
        state: metrics.state,
        degraded: isDegraded,
        failureCount: metrics.failures,
      };
      if (metrics.lastFailureTime > 0) {
        status.lastFailureTime = metrics.lastFailureTime;
      }
      if (fallbackGuidance) {
        status.fallbackGuidance = fallbackGuidance;
      }
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Get snapshot of degradation status
   */
  getSnapshot(): DegradationSnapshot {
    const statuses = this.getServerStatuses();
    const degraded = statuses.filter(s => s.degraded);
    const healthy = statuses.filter(s => !s.degraded).map(s => s.serverName);
    const degradationRatePct = statuses.length > 0
      ? Number(((degraded.length / statuses.length) * 100).toFixed(2))
      : 0;

    return {
      timestamp: new Date().toISOString(),
      degradedServers: degraded,
      healthyServers: healthy,
      totalServers: statuses.length,
      degradationRatePct,
    };
  }

  /**
   * Get fallback guidance for specific server
   */
  getFallbackGuidance(serverName: string): FallbackGuidance | null {
    const status = this.getServerStatuses().find(s => s.serverName === serverName);
    return status?.fallbackGuidance ?? null;
  }

  /**
   * Check if any servers are degraded
   */
  hasDegradedServers(): boolean {
    return this.getServerStatuses().some(s => s.degraded);
  }
}

export const gracefulDegradationService = new GracefulDegradationService();
