/**
 * Token Refresh Scheduler
 * 
 * Background service for proactive token refresh on mobile.
 * Monitors token expiration and automatically refreshes before expiry.
 * 
 * Features:
 * - Proactive refresh when token will expire soon (within 5 minutes)
 * - Background execution using Expo Background Fetch
 * - Retry logic with exponential backoff
 * - Handles refresh token expiration
 * - Network-aware scheduling (pauses on offline)
 * - Battery-friendly intervals
 * 
 * Usage:
 * ```tsx
 * // Start scheduler in App.tsx or _layout.tsx
 * useEffect(() => {
 *   TokenScheduler.start();
 *   return () => TokenScheduler.stop();
 * }, []);
 * ```
 * 
 * Related: UserSecureStore for token storage
 * Spec: FR-002, FR-040, SC-016 (subscription tier syncs across devices)
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import NetInfo from '@react-native-community/netinfo';
import { UserSecureStore } from '../storage/userSecureStore';

/**
 * Background task name for token refresh
 */
const TOKEN_REFRESH_TASK = 'user-token-refresh';

/**
 * Refresh configuration
 */
const REFRESH_CONFIG = {
  /** Check interval in seconds (5 minutes) */
  checkInterval: 300,
  
  /** Minimum time before expiration to trigger refresh (5 minutes) */
  refreshThresholdSeconds: 300,
  
  /** Maximum retry attempts on failure */
  maxRetries: 3,
  
  /** Base delay for exponential backoff (seconds) */
  retryBaseDelay: 30,
  
  /** API endpoint for token refresh */
  refreshEndpoint: process.env.EXPO_PUBLIC_API_URL + '/auth/refresh',
};

/**
 * Retry state for exponential backoff
 */
interface RetryState {
  attempt: number;
  nextRetryAt: number;
}

/**
 * Global retry state
 */
let retryState: RetryState = {
  attempt: 0,
  nextRetryAt: 0,
};

/**
 * Define background task for token refresh
 */
TaskManager.defineTask(TOKEN_REFRESH_TASK, async () => {
  try {
    console.log('[TokenScheduler] Background task started');
    
    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('[TokenScheduler] No network connection, skipping refresh');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Check if token will expire soon
    const willExpire = await UserSecureStore.willExpireSoon(REFRESH_CONFIG.refreshThresholdSeconds);
    
    if (!willExpire) {
      console.log('[TokenScheduler] Token is valid, no refresh needed');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Check retry backoff
    const now = Date.now();
    if (retryState.nextRetryAt > now) {
      console.log('[TokenScheduler] Retry backoff active, skipping refresh');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    
    // Attempt token refresh
    const refreshed = await refreshToken();
    
    if (refreshed) {
      console.log('[TokenScheduler] Token refreshed successfully');
      // Reset retry state on success
      retryState = { attempt: 0, nextRetryAt: 0 };
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.warn('[TokenScheduler] Token refresh failed');
      // Increment retry attempt
      retryState.attempt += 1;
      
      // Calculate exponential backoff
      const backoffDelay = REFRESH_CONFIG.retryBaseDelay * Math.pow(2, retryState.attempt - 1);
      retryState.nextRetryAt = now + (backoffDelay * 1000);
      
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  } catch (error) {
    console.error('[TokenScheduler] Background task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Refresh access token using refresh token
 * 
 * @returns True if refresh succeeded, false otherwise
 */
async function refreshToken(): Promise<boolean> {
  try {
    // Get current refresh token
    const refreshToken = await UserSecureStore.getUserRefreshToken();
    
    if (!refreshToken) {
      console.error('[TokenScheduler] No refresh token available');
      return false;
    }
    
    // Call refresh endpoint
    const response = await fetch(REFRESH_CONFIG.refreshEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });
    
    if (!response.ok) {
      console.error('[TokenScheduler] Refresh request failed:', response.status);
      
      // If refresh token is expired/invalid, clear session
      if (response.status === 401) {
        console.warn('[TokenScheduler] Refresh token expired, clearing session');
        await UserSecureStore.clearUserSession();
      }
      
      return false;
    }
    
    const data = await response.json();
    
    // Validate response
    if (!data.accessToken) {
      console.error('[TokenScheduler] Invalid refresh response (missing accessToken)');
      return false;
    }
    
    // Update stored tokens
    await UserSecureStore.setUserToken(data.accessToken);
    
    // Update refresh token if provided (rotation)
    if (data.refreshToken) {
      await UserSecureStore.setUserRefreshToken(data.refreshToken);
    }
    
    console.log('[TokenScheduler] Tokens updated successfully');
    return true;
  } catch (error) {
    console.error('[TokenScheduler] Token refresh error:', error);
    return false;
  }
}

/**
 * Token Refresh Scheduler
 * 
 * Manages background token refresh to maintain active sessions.
 */
export class TokenScheduler {
  /**
   * Start background token refresh scheduler
   * 
   * @returns Promise<void>
   * 
   * @example
   * ```tsx
   * useEffect(() => {
   *   TokenScheduler.start();
   *   return () => TokenScheduler.stop();
   * }, []);
   * ```
   */
  static async start(): Promise<void> {
    try {
      // Check if task is already registered
      const isRegistered = await TaskManager.isTaskRegisteredAsync(TOKEN_REFRESH_TASK);
      
      if (isRegistered) {
        console.log('[TokenScheduler] Task already registered');
        return;
      }
      
      // Register background fetch task
      await BackgroundFetch.registerTaskAsync(TOKEN_REFRESH_TASK, {
        minimumInterval: REFRESH_CONFIG.checkInterval,
        stopOnTerminate: false, // Continue after app termination
        startOnBoot: true, // Start on device boot
      });
      
      console.log('[TokenScheduler] Background task registered successfully');
      
      // Perform immediate check
      await this.checkNow();
    } catch (error) {
      console.error('[TokenScheduler] Failed to start scheduler:', error);
    }
  }
  
  /**
   * Stop background token refresh scheduler
   * 
   * @returns Promise<void>
   */
  static async stop(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(TOKEN_REFRESH_TASK);
      console.log('[TokenScheduler] Background task unregistered');
    } catch (error) {
      console.error('[TokenScheduler] Failed to stop scheduler:', error);
    }
  }
  
  /**
   * Check and refresh token immediately (foreground)
   * 
   * @returns Promise<boolean> - True if refresh occurred or not needed
   * 
   * @example
   * ```tsx
   * const refreshed = await TokenScheduler.checkNow();
   * if (refreshed) {
   *   console.log('Token is fresh');
   * }
   * ```
   */
  static async checkNow(): Promise<boolean> {
    try {
      const willExpire = await UserSecureStore.willExpireSoon(REFRESH_CONFIG.refreshThresholdSeconds);
      
      if (!willExpire) {
        console.log('[TokenScheduler] Token is valid');
        return true;
      }
      
      console.log('[TokenScheduler] Token expiring soon, refreshing...');
      const refreshed = await refreshToken();
      
      if (refreshed) {
        console.log('[TokenScheduler] Token refreshed successfully');
        return true;
      } else {
        console.error('[TokenScheduler] Token refresh failed');
        return false;
      }
    } catch (error) {
      console.error('[TokenScheduler] Check error:', error);
      return false;
    }
  }
  
  /**
   * Get scheduler status
   * 
   * @returns Promise<object> - Status information
   */
  static async getStatus(): Promise<{
    isRegistered: boolean;
    willExpireSoon: boolean;
    retryAttempt: number;
    nextRetryAt: number;
  }> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(TOKEN_REFRESH_TASK);
      const willExpireSoon = await UserSecureStore.willExpireSoon(REFRESH_CONFIG.refreshThresholdSeconds);
      
      return {
        isRegistered,
        willExpireSoon,
        retryAttempt: retryState.attempt,
        nextRetryAt: retryState.nextRetryAt,
      };
    } catch (error) {
      console.error('[TokenScheduler] Status check error:', error);
      return {
        isRegistered: false,
        willExpireSoon: false,
        retryAttempt: 0,
        nextRetryAt: 0,
      };
    }
  }
  
  /**
   * Reset retry state (useful after manual login)
   */
  static resetRetryState(): void {
    retryState = { attempt: 0, nextRetryAt: 0 };
    console.log('[TokenScheduler] Retry state reset');
  }
}

/**
 * Example usage in App.tsx or _layout.tsx:
 * 
 * ```tsx
 * import { useEffect } from 'react';
 * import { TokenScheduler } from './auth/tokenScheduler';
 * 
 * export default function App() {
 *   useEffect(() => {
 *     // Start scheduler on app mount
 *     TokenScheduler.start();
 *     
 *     // Check token immediately on app foreground
 *     const subscription = AppState.addEventListener('change', nextAppState => {
 *       if (nextAppState === 'active') {
 *         TokenScheduler.checkNow();
 *       }
 *     });
 *     
 *     // Cleanup on unmount
 *     return () => {
 *       TokenScheduler.stop();
 *       subscription.remove();
 *     };
 *   }, []);
 *   
 *   return <RootNavigator />;
 * }
 * ```
 * 
 * Example usage in login screen (reset retry state after successful login):
 * 
 * ```tsx
 * async function handleLogin() {
 *   const success = await loginUser(email, password);
 *   if (success) {
 *     TokenScheduler.resetRetryState();
 *     TokenScheduler.checkNow();
 *   }
 * }
 * ```
 */
