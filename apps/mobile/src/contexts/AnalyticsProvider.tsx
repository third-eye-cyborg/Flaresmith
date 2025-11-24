import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { initializeAnalytics, trackPageView } from '@flaresmith/utils';
import Constants from 'expo-constants';

/**
 * PostHog Analytics Provider for Expo
 * 
 * Initializes PostHog on app launch and tracks screen navigation.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Initialize PostHog on mount
  useEffect(() => {
    const initAnalytics = async () => {
      const apiKey = Constants.expoConfig?.extra?.POSTHOG_API_KEY;
      const host = Constants.expoConfig?.extra?.POSTHOG_HOST || 'https://app.posthog.com';

      if (!apiKey) {
        console.warn('PostHog API key not configured for mobile');
        return;
      }

      await initializeAnalytics({
        apiKey,
        host,
        platform: 'react-native',
      });

      console.log('PostHog analytics initialized for mobile');
    };

    initAnalytics().catch((error) => {
      console.error('Failed to initialize PostHog:', error);
    });
  }, []);

  // Track screen views on navigation
  useEffect(() => {
    if (pathname) {
      trackPageView({
        pagePath: pathname,
        pageTitle: pathname.split('/').pop() || 'Home',
        environment: (Constants.expoConfig?.extra?.ENVIRONMENT as 'dev' | 'staging' | 'prod') || 'dev',
        platform: 'mobile',
      });
    }
  }, [pathname]);

  return <>{children}</>;
}
