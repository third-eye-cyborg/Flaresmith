'use client';

import { useCallback } from 'react';
import {
  identifyUser,
  getFeatureFlag as getFlag,
  isFeatureEnabled,
  resetUser,
  trackProjectCreated,
  trackEnvironmentProvisioned,
  trackChatSessionStarted,
  trackError,
} from '@flaresmith/utils';
import type { AnalyticsEnvironment, AnalyticsPlatform } from '@flaresmith/types';

/**
 * PostHog Analytics Hook for Next.js
 * 
 * Provides convenient analytics methods for web app components.
 * Automatically includes platform='web' context.
 */
export function useAnalytics() {
  const environment = (process.env.NEXT_PUBLIC_ENVIRONMENT || 'dev') as AnalyticsEnvironment;
  const platform: AnalyticsPlatform = 'web';

  const identify = useCallback((userId: string, traits?: Record<string, any>) => {
    identifyUser(userId, traits);
  }, []);

  const reset = useCallback(() => {
    resetUser();
  }, []);

  const getFeatureFlag = useCallback(async (flagKey: string) => {
    return await getFlag(flagKey);
  }, []);

  const isEnabled = useCallback(async (flagKey: string) => {
    return await isFeatureEnabled(flagKey);
  }, []);

  // Convenience wrappers for common events with auto-filled platform/environment
  const trackProject = useCallback(
    (params: {
      userId: string;
      projectId: string;
      projectName: string;
      integrations: string[];
      provisioningDurationMs: number;
    }) => {
      trackProjectCreated({
        ...params,
        environment,
        platform,
      });
    },
    [environment]
  );

  const trackEnvironment = useCallback(
    (params: {
      userId: string;
      projectId: string;
      environmentId: string;
      environmentName: string;
      environmentType: 'dev' | 'staging' | 'prod' | 'preview';
      integrations: string[];
      provisioningDurationMs: number;
    }) => {
      trackEnvironmentProvisioned({
        ...params,
        environment,
        platform,
      });
    },
    [environment]
  );

  const trackChat = useCallback(
    (params: {
      userId: string;
      projectId: string;
      sessionId: string;
      environmentId?: string;
    }) => {
      trackChatSessionStarted({
        ...params,
        environment,
        platform,
      });
    },
    [environment]
  );

  const trackErrorEvent = useCallback(
    (params: {
      userId?: string;
      projectId?: string;
      errorCode: string;
      errorMessage: string;
      severity: 'info' | 'warn' | 'error' | 'critical';
      stackTrace?: string;
      context?: Record<string, unknown>;
    }) => {
      trackError({
        ...params,
        environment,
        platform,
      });
    },
    [environment]
  );

  return {
    identify,
    reset,
    getFeatureFlag,
    isEnabled,
    trackProject,
    trackEnvironment,
    trackChat,
    trackError: trackErrorEvent,
  };
}
