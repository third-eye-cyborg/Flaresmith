'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initializeAnalytics, trackPageView } from '@flaresmith/utils';

/**
 * PostHog Analytics Provider for Next.js
 * 
 * Initializes PostHog on client-side and tracks page views.
 * Uses Next.js App Router navigation hooks.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize PostHog on mount
  useEffect(() => {
    const initAnalytics = async () => {
      const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
      const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

      if (!apiKey) {
        console.warn('PostHog API key not configured - analytics disabled');
        return;
      }

      try {
        await initializeAnalytics({
          apiKey,
          host,
          platform: 'browser',
          autocapture: true,
          capture_pageview: false, // We'll track manually for better control
          session_recording: {
            enabled: true,
          },
        });
      } catch (error) {
        console.error('Failed to initialize PostHog:', error);
      }
    };

    initAnalytics();
  }, []);

  // Track page views on navigation
  useEffect(() => {
    if (pathname) {
      try {
        const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
        
        trackPageView({
          pagePath: url,
          pageTitle: typeof document !== 'undefined' ? document.title : '',
          referrer: typeof document !== 'undefined' ? (document.referrer || undefined) : undefined,
          environment: (process.env.NEXT_PUBLIC_ENVIRONMENT as 'dev' | 'staging' | 'prod') || 'dev',
          platform: 'web',
        });
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
