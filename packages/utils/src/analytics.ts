import { PostHog } from 'posthog-node';

/**
 * Analytics Service - PostHog Integration
 * 
 * Provides analytics tracking for user events and feature usage.
 * Per FR-035: Emit telemetry for observability.
 */

let posthogClient: PostHog | null = null;

export function initializeAnalytics(): void {
  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';

  if (!apiKey) {
    console.warn('PostHog API key not found - analytics disabled');
    return;
  }

  posthogClient = new PostHog(apiKey, {
    host,
    flushAt: 20, // Batch events
    flushInterval: 10000, // Flush every 10 seconds
  });

  console.log('PostHog analytics initialized');
}

export interface AnalyticsEvent {
  userId?: string;
  distinctId: string;
  event: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

export function trackEvent(event: AnalyticsEvent): void {
  if (!posthogClient) {
    // Analytics not initialized - skip silently
    return;
  }

  try {
    posthogClient.capture({
      distinctId: event.distinctId,
      event: event.event,
      properties: {
        ...event.properties,
        $set: event.userId ? { userId: event.userId } : undefined,
      },
      timestamp: event.timestamp,
    });
  } catch (error) {
    console.error('Failed to track analytics event:', error);
  }
}

export function identifyUser(userId: string, properties?: Record<string, any>): void {
  if (!posthogClient) return;

  try {
    posthogClient.identify({
      distinctId: userId,
      properties,
    });
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
}

export async function shutdownAnalytics(): Promise<void> {
  if (!posthogClient) return;

  try {
    await posthogClient.shutdown();
    console.log('PostHog analytics shut down');
  } catch (error) {
    console.error('Failed to shutdown analytics:', error);
  }
}

// Common event tracking helpers

export function trackProjectCreated(userId: string, projectId: string, integrations: string[]): void {
  trackEvent({
    distinctId: userId,
    userId,
    event: 'project_created',
    properties: {
      projectId,
      integrations,
      integrationCount: integrations.length,
    },
  });
}

export function trackEnvironmentPromotion(
  userId: string,
  projectId: string,
  from: string,
  to: string
): void {
  trackEvent({
    distinctId: userId,
    userId,
    event: 'environment_promoted',
    properties: {
      projectId,
      fromEnvironment: from,
      toEnvironment: to,
    },
  });
}

export function trackSpecApplied(
  userId: string,
  projectId: string,
  filesChanged: number,
  durationMs: number
): void {
  trackEvent({
    distinctId: userId,
    userId,
    event: 'spec_applied',
    properties: {
      projectId,
      filesChanged,
      durationMs,
    },
  });
}

export function trackChatSessionStarted(userId: string, projectId: string): void {
  trackEvent({
    distinctId: userId,
    userId,
    event: 'chat_session_started',
    properties: {
      projectId,
    },
  });
}

export function trackDeployment(
  userId: string,
  projectId: string,
  environment: string,
  status: 'succeeded' | 'failed',
  durationMs?: number
): void {
  trackEvent({
    distinctId: userId,
    userId,
    event: 'deployment_completed',
    properties: {
      projectId,
      environment,
      status,
      durationMs,
    },
  });
}
