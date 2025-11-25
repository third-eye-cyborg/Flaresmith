/**
 * User Deep Link Handling (T094)
 * 
 * Handles deep links for user mobile app navigation and auth callbacks.
 * 
 * Supported Deep Links:
 * - cloudmake://login - Navigate to user login
 * - cloudmake://register - Navigate to user registration
 * - cloudmake://dashboard - Navigate to user dashboard
 * - cloudmake://auth/callback?code=XXX - OAuth callback
 * - cloudmake://subscription - Subscription management
 * - cloudmake://billing - Billing details
 * - cloudmake://settings - User settings
 * 
 * Usage:
 * ```typescript
 * import { DeepLinkHandler } from './navigation/deepLinks';
 * 
 * // Register handler on app start
 * DeepLinkHandler.initialize();
 * 
 * // Handle incoming link
 * const handled = await DeepLinkHandler.handleDeepLink('cloudmake://subscription');
 * ```
 */

import * as Linking from 'expo-linking';
import { router } from 'expo-router';

const USER_SCHEME = 'cloudmake';

export interface DeepLinkRoute {
  path: string;
  params?: Record<string, string>;
}

export class DeepLinkHandler {
  private static listeners: Array<(url: string) => void> = [];

  /**
   * Initialize deep link handler
   */
  static initialize(): void {
    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then((url: string | null) => {
      if (url) {
        this.handleDeepLink(url);
      }
    });

    // Handle subsequent deep links (app already open)
    Linking.addEventListener('url', (event: { url: string }) => {
      this.handleDeepLink(event.url);
    });

    console.log('[DeepLinkHandler] User deep link handler initialized');
  }

  /**
   * Parse deep link URL into route and params
   */
  static parseDeepLink(url: string): DeepLinkRoute | null {
    try {
      const { hostname, path, queryParams } = Linking.parse(url);

      // Validate scheme
      if (!url.startsWith(USER_SCHEME)) {
        console.warn('[DeepLinkHandler] Invalid scheme, expected:', USER_SCHEME);
        return null;
      }

      const routePath = hostname ? `/${hostname}${path || ''}` : path || '/';

      return {
        path: routePath,
        params: queryParams as Record<string, string>,
      };
    } catch (error) {
      console.error('[DeepLinkHandler] Failed to parse deep link:', error);
      return null;
    }
  }

  /**
   * Handle deep link navigation
   */
  static async handleDeepLink(url: string): Promise<boolean> {
    const route = this.parseDeepLink(url);

    if (!route) {
      return false;
    }

    console.log('[DeepLinkHandler] Handling deep link:', route);

    // Notify listeners
    this.listeners.forEach((listener) => listener(url));

    try {
      // Route to appropriate screen
      switch (route.path) {
        case '/login':
          router.push('/(auth)/login');
          return true;

        case '/register':
          router.push('/(auth)/register');
          return true;

        case '/dashboard':
          router.push('/dashboard');
          return true;

        case '/auth/callback':
          if (route.params?.code) {
            router.push({
              pathname: '/auth/callback',
              params: { code: route.params.code },
            });
            return true;
          }
          break;

        case '/subscription':
          router.push('/subscription');
          return true;

        case '/billing':
          router.push('/billing');
          return true;

        case '/settings':
          router.push('/settings');
          return true;

        case '/upgrade':
          // Deep link from web/email to subscription upgrade
          router.push('/subscription?action=upgrade');
          return true;

        default:
          console.warn('[DeepLinkHandler] Unknown route:', route.path);
          return false;
      }
    } catch (error) {
      console.error('[DeepLinkHandler] Navigation error:', error);
      return false;
    }

    return false;
  }

  /**
   * Add listener for deep link events
   */
  static addListener(listener: (url: string) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Generate deep link URL for user actions
   */
  static generateDeepLink(path: string, params?: Record<string, string>): string {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return `${USER_SCHEME}://${path}${queryString}`;
  }
}
