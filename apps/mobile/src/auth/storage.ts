/**
 * T021: Secure storage helpers
 * Wrapper around expo-secure-store for token and session persistence
 * Provides type-safe storage/retrieval with error handling
 */

import * as SecureStore from "expo-secure-store";

/**
 * Storage keys for secure data
 */
const KEYS = {
  ACCESS_TOKEN: "flaresmith_access_token",
  REFRESH_TOKEN: "flaresmith_refresh_token",
  USER_EMAIL: "flaresmith_user_email",
  USER_ID: "flaresmith_user_id",
  SESSION_EXPIRES: "flaresmith_session_expires",
  REFRESH_EXPIRES: "flaresmith_refresh_expires",
} as const;

/**
 * Token pair stored securely on device
 */
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string; // ISO 8601 timestamp
  refreshExpiresAt: string; // ISO 8601 timestamp
}

/**
 * User metadata for display without full session
 */
export interface UserMetadata {
  id: string;
  email: string;
}

/**
 * Save authentication tokens securely
 * @param tokens - Access and refresh token pair with expiry
 */
export async function saveTokens(tokens: StoredTokens): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, tokens.accessToken),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, tokens.refreshToken),
      SecureStore.setItemAsync(KEYS.SESSION_EXPIRES, tokens.accessExpiresAt),
      SecureStore.setItemAsync(KEYS.REFRESH_EXPIRES, tokens.refreshExpiresAt),
    ]);
  } catch (error) {
    console.error("Failed to save tokens:", error);
    throw new Error("Could not persist authentication session");
  }
}

/**
 * Retrieve stored authentication tokens
 * @returns Token pair or null if not found/expired
 */
export async function getTokens(): Promise<StoredTokens | null> {
  try {
    const [accessToken, refreshToken, accessExpiresAt, refreshExpiresAt] = await Promise.all([
      SecureStore.getItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.getItemAsync(KEYS.REFRESH_TOKEN),
      SecureStore.getItemAsync(KEYS.SESSION_EXPIRES),
      SecureStore.getItemAsync(KEYS.REFRESH_EXPIRES),
    ]);

    if (!accessToken || !refreshToken || !accessExpiresAt || !refreshExpiresAt) {
      return null;
    }

    // Check if refresh token is expired (access token can be refreshed)
    const refreshExpiry = new Date(refreshExpiresAt);
    if (refreshExpiry < new Date()) {
      // Refresh token expired, clear all tokens
      await clearTokens();
      return null;
    }

    return {
      accessToken,
      refreshToken,
      accessExpiresAt,
      refreshExpiresAt,
    };
  } catch (error) {
    console.error("Failed to retrieve tokens:", error);
    return null;
  }
}

/**
 * Clear all stored authentication data
 */
export async function clearTokens(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(KEYS.SESSION_EXPIRES),
      SecureStore.deleteItemAsync(KEYS.REFRESH_EXPIRES),
      SecureStore.deleteItemAsync(KEYS.USER_EMAIL),
      SecureStore.deleteItemAsync(KEYS.USER_ID),
    ]);
  } catch (error) {
    console.error("Failed to clear tokens:", error);
    // Don't throw - best effort cleanup
  }
}

/**
 * Save user metadata for quick access
 * @param user - User ID and email
 */
export async function saveUserMetadata(user: UserMetadata): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.USER_ID, user.id),
      SecureStore.setItemAsync(KEYS.USER_EMAIL, user.email),
    ]);
  } catch (error) {
    console.error("Failed to save user metadata:", error);
    // Non-critical - tokens are primary source of truth
  }
}

/**
 * Retrieve user metadata
 * @returns User info or null if not found
 */
export async function getUserMetadata(): Promise<UserMetadata | null> {
  try {
    const [id, email] = await Promise.all([
      SecureStore.getItemAsync(KEYS.USER_ID),
      SecureStore.getItemAsync(KEYS.USER_EMAIL),
    ]);

    if (!id || !email) {
      return null;
    }

    return { id, email };
  } catch (error) {
    console.error("Failed to retrieve user metadata:", error);
    return null;
  }
}

/**
 * Check if access token is expired or close to expiry
 * @param bufferSeconds - Treat token as expired if within this many seconds of expiry (default 60)
 * @returns true if token should be refreshed
 */
export async function shouldRefreshToken(bufferSeconds = 60): Promise<boolean> {
  try {
    const expiresAt = await SecureStore.getItemAsync(KEYS.SESSION_EXPIRES);
    if (!expiresAt) {
      return true;
    }

    const expiry = new Date(expiresAt);
    const now = new Date();
    const bufferMs = bufferSeconds * 1000;

    return expiry.getTime() - now.getTime() < bufferMs;
  } catch (error) {
    console.error("Failed to check token expiry:", error);
    return true; // Assume expired on error
  }
}
