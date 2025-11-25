/**
 * Admin Deep Link Handling (T093)
 * 
 * Handles deep links for admin mobile app navigation and auth callbacks.
 * 
 * Supported Deep Links:
 * - cloudmake-admin://login - Navigate to admin login
 * - cloudmake-admin://dashboard - Navigate to admin dashboard
 * - cloudmake-admin://auth/callback?code=XXX - OAuth callback
 * - cloudmake-admin://mfa/verify - MFA verification screen
 * - cloudmake-admin://users - Admin users list
 * - cloudmake-admin://audit - Audit logs view
 * 
 * Usage:
 * ```typescript
 * import { DeepLinkHandler } from './navigation/deepLinks';
 * 
 * // Register handler on app start
 * DeepLinkHandler.initialize();
 * 
 * // Handle incoming link
 * const handled = await DeepLinkHandler.handleDeepLink('cloudmake-admin://dashboard');
 * ```
 */

import * as Linking from 'expo-linking';
import { router } from 'expo-router';

const ADMIN_SCHEME = 'cloudmake-admin';

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

    console.log('[DeepLinkHandler] Admin deep link handler initialized');
  }

  /**
   * Parse deep link URL into route and params
   */
  static parseDeepLink(url: string): DeepLinkRoute | null {
    try {
      const { hostname, path, queryParams } = Linking.parse(url);

      // Validate scheme
      if (!url.startsWith(ADMIN_SCHEME)) {
        console.warn('[DeepLinkHandler] Invalid scheme, expected:', ADMIN_SCHEME);
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
          router.push('/admin/login');
          return true;

        case '/dashboard':
          router.push('/admin/dashboard');
          return true;

        case '/auth/callback':
          if (route.params?.code) {
            router.push({
              pathname: '/admin/auth/callback',
              params: { code: route.params.code },
            });
            return true;
          }
          break;

        case '/mfa/verify':
          router.push('/admin/mfa/verify');
          return true;

        case '/users':
          router.push('/admin/users');
          return true;

        case '/audit':
          router.push('/admin/audit');
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
   * Generate deep link URL for admin actions
   */
  static generateDeepLink(path: string, params?: Record<string, string>): string {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return `${ADMIN_SCHEME}://${path}${queryString}`;
  }
}
