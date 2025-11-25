'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
// import { initializeAnalytics, trackPageView } from '@flaresmith/utils';

/**
 * PostHog Analytics Provider for Next.js
 * 
 * Initializes PostHog on client-side and tracks page views.
 * Uses Next.js App Router navigation hooks.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize PostHog on mount - temporarily disabled
  useEffect(() => {
    // Analytics temporarily disabled to fix build issues
    console.log('Analytics disabled - waiting for proper web-only setup');
  }, [pathname, searchParams]);

  return <>{children}</>;
}
