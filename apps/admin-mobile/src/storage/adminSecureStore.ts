/**
 * Admin Secure Storage Wrapper (T091)
 * 
 * Provides secure storage for admin session tokens on mobile devices.
 * Uses expo-secure-store for encrypted storage with hardware-backed keychain.
 * 
 * Security Features:
 * - Hardware-backed encryption (iOS Keychain, Android Keystore)
 * - Automatic expiration based on token exp claim
 * - Separate storage namespace from user tokens (prevents cross-contamination)
 * - Audit logging for token access events
 * 
 * Usage:
 * ```typescript
 * import { AdminSecureStore } from './storage/adminSecureStore';
 * 
 * // Store admin token
 * await AdminSecureStore.setAdminToken(token);
 * 
 * // Retrieve admin token
 * const token = await AdminSecureStore.getAdminToken();
 * 
 * // Clear admin session
 * await AdminSecureStore.clearAdminSession();
 * ```
 */

import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';

const ADMIN_TOKEN_KEY = 'cloudmake_admin_token';
const ADMIN_REFRESH_TOKEN_KEY = 'cloudmake_admin_refresh_token';
const ADMIN_SESSION_METADATA_KEY = 'cloudmake_admin_session_metadata';

export interface AdminTokenPayload {
  sub: string; // admin user ID
  type: 'admin';
  role: 'admin';
  iat: number;
  exp: number;
}

export interface AdminSessionMetadata {
  userId: string;
  email?: string;
  lastAccessedAt: number;
  deviceId?: string;
}

export class AdminSecureStore {
  /**
   * Store admin access token securely
   */
  static async setAdminToken(token: string): Promise<void> {
    try {
      // Validate token structure
      const payload = jwtDecode<AdminTokenPayload>(token);
      
      if (payload.type !== 'admin' || payload.role !== 'admin') {
        throw new Error('Invalid token type: expected admin token');
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error('Cannot store expired admin token');
      }

      await SecureStore.setItemAsync(ADMIN_TOKEN_KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });

      // Update session metadata
      await this.updateSessionMetadata({
        userId: payload.sub,
        lastAccessedAt: Date.now(),
      });

      console.log('[AdminSecureStore] Admin token stored successfully');
    } catch (error) {
      console.error('[AdminSecureStore] Failed to store admin token:', error);
      throw error;
    }
  }

  /**
   * Retrieve admin access token
   * Returns null if token is expired or not found
   */
  static async getAdminToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync(ADMIN_TOKEN_KEY);
      
      if (!token) {
        return null;
      }

      // Validate token expiration
      const payload = jwtDecode<AdminTokenPayload>(token);
      const now = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < now) {
        console.warn('[AdminSecureStore] Admin token expired, clearing session');
        await this.clearAdminSession();
        return null;
      }

      // Update last accessed timestamp
      await this.updateSessionMetadata({
        userId: payload.sub,
        lastAccessedAt: Date.now(),
      });

      return token;
    } catch (error) {
      console.error('[AdminSecureStore] Failed to retrieve admin token:', error);
      return null;
    }
  }

  /**
   * Store admin refresh token securely
   */
  static async setAdminRefreshToken(refreshToken: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(ADMIN_REFRESH_TOKEN_KEY, refreshToken, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
      console.log('[AdminSecureStore] Admin refresh token stored successfully');
    } catch (error) {
      console.error('[AdminSecureStore] Failed to store admin refresh token:', error);
      throw error;
    }
  }

  /**
   * Retrieve admin refresh token
   */
  static async getAdminRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ADMIN_REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('[AdminSecureStore] Failed to retrieve admin refresh token:', error);
      return null;
    }
  }

  /**
   * Update admin session metadata
   */
  private static async updateSessionMetadata(
    metadata: Partial<AdminSessionMetadata>
  ): Promise<void> {
    try {
      const existing = await this.getSessionMetadata();
      const updated = { ...existing, ...metadata };
      
      await SecureStore.setItemAsync(
        ADMIN_SESSION_METADATA_KEY,
        JSON.stringify(updated),
        { keychainAccessible: SecureStore.WHEN_UNLOCKED }
      );
    } catch (error) {
      console.error('[AdminSecureStore] Failed to update session metadata:', error);
    }
  }

  /**
   * Get admin session metadata
   */
  static async getSessionMetadata(): Promise<AdminSessionMetadata | null> {
    try {
      const metadata = await SecureStore.getItemAsync(ADMIN_SESSION_METADATA_KEY);
      return metadata ? JSON.parse(metadata) : null;
    } catch (error) {
      console.error('[AdminSecureStore] Failed to retrieve session metadata:', error);
      return null;
    }
  }

  /**
   * Check if admin is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getAdminToken();
    return token !== null;
  }

  /**
   * Clear admin session (logout)
   */
  static async clearAdminSession(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(ADMIN_TOKEN_KEY),
        SecureStore.deleteItemAsync(ADMIN_REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(ADMIN_SESSION_METADATA_KEY),
      ]);
      console.log('[AdminSecureStore] Admin session cleared successfully');
    } catch (error) {
      console.error('[AdminSecureStore] Failed to clear admin session:', error);
      throw error;
    }
  }

  /**
   * Get token expiration timestamp (seconds since epoch)
   */
  static async getTokenExpiration(): Promise<number | null> {
    try {
      const token = await SecureStore.getItemAsync(ADMIN_TOKEN_KEY);
      if (!token) return null;

      const payload = jwtDecode<AdminTokenPayload>(token);
      return payload.exp || null;
    } catch (error) {
      console.error('[AdminSecureStore] Failed to get token expiration:', error);
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
