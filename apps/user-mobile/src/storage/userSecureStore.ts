/**
 * User Secure Storage Wrapper (T092)
 * 
 * Provides secure storage for user session tokens on mobile devices.
 * Uses expo-secure-store for encrypted storage with hardware-backed keychain.
 * 
 * Security Features:
 * - Hardware-backed encryption (iOS Keychain, Android Keystore)
 * - Automatic expiration based on token exp claim
 * - Separate storage namespace from admin tokens (prevents cross-contamination)
 * - Subscription tier caching for offline access
 * - Biometric authentication hints stored
 * 
 * Usage:
 * ```typescript
 * import { UserSecureStore } from './storage/userSecureStore';
 * 
 * // Store user token
 * await UserSecureStore.setUserToken(token);
 * 
 * // Retrieve user token
 * const token = await UserSecureStore.getUserToken();
 * 
 * // Clear user session
 * await UserSecureStore.clearUserSession();
 * ```
 */

import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';

const USER_TOKEN_KEY = 'cloudmake_user_token';
const USER_REFRESH_TOKEN_KEY = 'cloudmake_user_refresh_token';
const USER_SESSION_METADATA_KEY = 'cloudmake_user_session_metadata';
const BIOMETRIC_ENABLED_KEY = 'cloudmake_biometric_enabled';

export interface UserTokenPayload {
  sub: string; // user ID
  type: 'user';
  role: 'user';
  tier: 'free' | 'pro' | 'enterprise';
  iat: number;
  exp: number;
}

export interface UserSessionMetadata {
  userId: string;
  email?: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  lastAccessedAt: number;
  deviceId?: string;
  biometricEnabled: boolean;
}

export class UserSecureStore {
  /**
   * Store user access token securely
   */
  static async setUserToken(token: string): Promise<void> {
    try {
      // Validate token structure
      const payload = jwtDecode<UserTokenPayload>(token);
      
      if (payload.type !== 'user' || payload.role !== 'user') {
        throw new Error('Invalid token type: expected user token');
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error('Cannot store expired user token');
      }

      await SecureStore.setItemAsync(USER_TOKEN_KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });

      // Update session metadata including subscription tier
      await this.updateSessionMetadata({
        userId: payload.sub,
        subscriptionTier: payload.tier,
        lastAccessedAt: Date.now(),
      });

      console.log('[UserSecureStore] User token stored successfully');
    } catch (error) {
      console.error('[UserSecureStore] Failed to store user token:', error);
      throw error;
    }
  }

  /**
   * Retrieve user access token
   * Returns null if token is expired or not found
   */
  static async getUserToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync(USER_TOKEN_KEY);
      
      if (!token) {
        return null;
      }

      // Validate token expiration
      const payload = jwtDecode<UserTokenPayload>(token);
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < now) {
        console.warn('[UserSecureStore] User token expired, clearing session');
        await this.clearUserSession();
        return null;
      }

      // Update last accessed timestamp and tier
      await this.updateSessionMetadata({
        userId: payload.sub,
        subscriptionTier: payload.tier,
        lastAccessedAt: Date.now(),
      });

      return token;
    } catch (error) {
      console.error('[UserSecureStore] Failed to retrieve user token:', error);
      return null;
    }
  }

  /**
   * Store user refresh token securely
   */
  static async setUserRefreshToken(refreshToken: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_REFRESH_TOKEN_KEY, refreshToken, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
      console.log('[UserSecureStore] User refresh token stored successfully');
    } catch (error) {
      console.error('[UserSecureStore] Failed to store user refresh token:', error);
      throw error;
    }
  }

  /**
   * Retrieve user refresh token
   */
  static async getUserRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(USER_REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('[UserSecureStore] Failed to retrieve user refresh token:', error);
      return null;
    }
  }

  /**
   * Update user session metadata
   */
  private static async updateSessionMetadata(
    metadata: Partial<UserSessionMetadata>
  ): Promise<void> {
    try {
      const existing = await this.getSessionMetadata();
      const updated = { ...existing, ...metadata } as UserSessionMetadata;
      
      await SecureStore.setItemAsync(
        USER_SESSION_METADATA_KEY,
        JSON.stringify(updated),
        { keychainAccessible: SecureStore.WHEN_UNLOCKED }
      );
    } catch (error) {
      console.error('[UserSecureStore] Failed to update session metadata:', error);
    }
  }

  /**
   * Get user session metadata (including cached subscription tier)
   */
  static async getSessionMetadata(): Promise<UserSessionMetadata | null> {
    try {
      const metadata = await SecureStore.getItemAsync(USER_SESSION_METADATA_KEY);
      return metadata ? JSON.parse(metadata) : null;
    } catch (error) {
      console.error('[UserSecureStore] Failed to retrieve session metadata:', error);
      return null;
    }
  }

  /**
   * Get cached subscription tier (offline-safe)
   */
  static async getSubscriptionTier(): Promise<'free' | 'pro' | 'enterprise' | null> {
    const metadata = await this.getSessionMetadata();
    return metadata?.subscriptionTier || null;
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getUserToken();
    return token !== null;
  }

  /**
   * Clear user session (logout)
   */
  static async clearUserSession(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(USER_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_SESSION_METADATA_KEY),
        // Preserve biometric preference across sessions
      ]);
      console.log('[UserSecureStore] User session cleared successfully');
    } catch (error) {
      console.error('[UserSecureStore] Failed to clear user session:', error);
      throw error;
    }
  }

  /**
   * Enable biometric authentication for future logins
   */
  static async enableBiometric(): Promise<void> {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true', {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
      await this.updateSessionMetadata({ biometricEnabled: true });
      console.log('[UserSecureStore] Biometric authentication enabled');
    } catch (error) {
      console.error('[UserSecureStore] Failed to enable biometric:', error);
      throw error;
    }
  }

  /**
   * Disable biometric authentication
   */
  static async disableBiometric(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      await this.updateSessionMetadata({ biometricEnabled: false });
      console.log('[UserSecureStore] Biometric authentication disabled');
    } catch (error) {
      console.error('[UserSecureStore] Failed to disable biometric:', error);
      throw error;
    }
  }

  /**
   * Check if biometric authentication is enabled
   */
  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('[UserSecureStore] Failed to check biometric status:', error);
      return false;
    }
  }

  /**
   * Get token expiration timestamp (seconds since epoch)
   */
  static async getTokenExpiration(): Promise<number | null> {
    try {
      const token = await SecureStore.getItemAsync(USER_TOKEN_KEY);
      if (!token) return null;

      const payload = jwtDecode<UserTokenPayload>(token);
      return payload.exp || null;
    } catch (error) {
      console.error('[UserSecureStore] Failed to get token expiration:', error);
      return null;
    }
  }

  /**
   * Get time until token expiration (milliseconds)
   */
  static async getTimeUntilExpiration(): Promise<number | null> {
    const exp = await this.getTokenExpiration();
    if (!exp) return null;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExp = (exp - now) * 1000;
    return timeUntilExp > 0 ? timeUntilExp : 0;
  }

  /**
   * Check if token will expire within specified milliseconds
   */
  static async willExpireSoon(withinMs: number = 5 * 60 * 1000): Promise<boolean> {
    const timeUntilExp = await this.getTimeUntilExpiration();
    if (timeUntilExp === null) return true;
    return timeUntilExp < withinMs;
  }
}
