import type { PostHog as PostHogNode } from 'posthog-node';
import type { AnalyticsEvent } from '@flaresmith/types';

/**
 * Analytics Service - PostHog Integration (Multi-Platform)
 * 
 * Provides analytics tracking for user events and feature usage.
 * Supports web (posthog-js), mobile (posthog-react-native), and server (posthog-node).
 * Per FR-035: Emit telemetry for observability.
 */

type PostHogClient = PostHogNode | any; // 'any' covers browser and React Native clients
let posthogClient: PostHogClient | null = null;
let platform: 'node' | 'browser' | 'react-native' | null = null;

export interface AnalyticsConfig {
  apiKey: string;
  host?: string;
  platform?: 'node' | 'browser' | 'react-native';
  /** For server-side (Node) batch configuration */
  flushAt?: number;
  flushInterval?: number;
  /** For client-side autocapture and session recording */
  autocapture?: boolean;
  capture_pageview?: boolean;
  session_recording?: {
    enabled?: boolean;
  };
}

/**
 * Initialize PostHog analytics client
 * 
 * Platform detection:
 * - If window exists → browser (posthog-js)
 * - If React Native modules exist → react-native (posthog-react-native)
 * - Otherwise → node (posthog-node)
 */
export async function initializeAnalytics(config?: AnalyticsConfig): Promise<void> {
  const apiKey = config?.apiKey || process.env.POSTHOG_API_KEY;
  const host = config?.host || process.env.POSTHOG_HOST || 'https://app.posthog.com';

  if (!apiKey) {
    console.warn('PostHog API key not found - analytics disabled');
    return;
  }

  // Detect platform if not explicitly provided
  if (config?.platform) {
    platform = config.platform;
  } else if (typeof window !== 'undefined') {
    platform = 'browser';
  } else if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    platform = 'react-native';
  } else {
    platform = 'node';
  }

  try {
    switch (platform) {
      case 'browser': {
        const posthog = (await import('posthog-js')).default;
        posthog.init(apiKey, {
          api_host: host,
          autocapture: config?.autocapture ?? true,
          capture_pageview: config?.capture_pageview ?? true,
          session_recording: config?.session_recording ?? { enabled: true },
        });
        posthogClient = posthog;
        console.log('PostHog analytics initialized (browser)');
        break;
      }

      case 'react-native': {
        const { PostHog } = await import('posthog-react-native');
        posthogClient = await PostHog.initAsync(apiKey, {
          host,
          captureApplicationLifecycleEvents: true,
          captureDeepLinks: true,
        });
        console.log('PostHog analytics initialized (React Native)');
        break;
      }

      case 'node': {
        const { PostHog } = await import('posthog-node');
        posthogClient = new PostHog(apiKey, {
          host,
          flushAt: config?.flushAt ?? 20,
          flushInterval: config?.flushInterval ?? 10000,
        });
        console.log('PostHog analytics initialized (Node)');
        break;
      }
    }
  } catch (error) {
    console.error('Failed to initialize PostHog analytics:', error);
  }
}

/**
 * Track analytics event with type safety
 * Uses Zod-validated event schemas from @flaresmith/types
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (!posthogClient || !platform) {
    return; // Analytics not initialized - skip silently
  }

  try {
    const { event: eventName, properties } = event;
    const { user_id, distinct_id, timestamp, ...eventProps } = properties;

    switch (platform) {
      case 'browser':
        posthogClient.capture(eventName, eventProps);
        break;

      case 'react-native':
        posthogClient.capture(eventName, eventProps);
        break;

      case 'node':
        posthogClient.capture({
          distinctId: distinct_id || user_id || 'anonymous',
          event: eventName,
          properties: eventProps,
          timestamp: timestamp ? new Date(timestamp) : undefined,
        });
        break;
    }
  } catch (error) {
    console.error('Failed to track analytics event:', error);
  }
}

/**
 * Identify user with properties
 */
export function identifyUser(userId: string, properties?: Record<string, any>): void {
  if (!posthogClient || !platform) return;

  try {
    switch (platform) {
      case 'browser':
      case 'react-native':
        posthogClient.identify(userId, properties);
        break;

      case 'node':
        posthogClient.identify({
          distinctId: userId,
          properties,
        });
        break;
    }
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
}

/**
 * Get feature flag value
 * Returns boolean, string, or undefined if flag doesn't exist
 */
export async function getFeatureFlag(
  flagKey: string,
  distinctId?: string
): Promise<boolean | string | undefined> {
  if (!posthogClient || !platform) return undefined;

  try {
    switch (platform) {
      case 'browser':
      case 'react-native':
        return posthogClient.getFeatureFlag(flagKey);

      case 'node':
        if (!distinctId) {
          console.warn('distinctId required for server-side feature flags');
          return undefined;
        }
        return await posthogClient.getFeatureFlag(flagKey, distinctId);

      default:
        return undefined;
    }
  } catch (error) {
    console.error('Failed to get feature flag:', error);
    return undefined;
  }
}

/**
 * Check if feature flag is enabled (boolean variant)
 */
export async function isFeatureEnabled(
  flagKey: string,
  distinctId?: string
): Promise<boolean> {
  const flagValue = await getFeatureFlag(flagKey, distinctId);
  return flagValue === true;
}

/**
 * Shutdown analytics client (Node only)
 */
export async function shutdownAnalytics(): Promise<void> {
  if (!posthogClient || platform !== 'node') return;

  try {
    await posthogClient.shutdown();
    console.log('PostHog analytics shut down');
  } catch (error) {
    console.error('Failed to shutdown analytics:', error);
  }
}

/**
 * Reset user identity (client-side only)
 * Useful for logout flows
 */
export function resetUser(): void {
  if (!posthogClient || platform === 'node') return;

  try {
    posthogClient.reset();
  } catch (error) {
    console.error('Failed to reset user:', error);
  }
}
