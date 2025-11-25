/**
 * T022: useAuth hook
 * Manages authentication state, token refresh, and session persistence
 * Integrates AuthResource API client with secure storage
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { AuthResource } from "@flaresmith/api-client";
import { FlaresmithClient } from "@flaresmith/api-client";
import { getEnv } from "@flaresmith/utils";
import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  RefreshResponse,
} from "@flaresmith/types";
import * as storage from "../auth/storage";

/**
 * Auth state for UI
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email: string;
  } | null;
  accessToken: string | null;
}

/**
 * Hook return type with auth methods
 */
export interface UseAuthReturn {
  state: AuthState;
  register: (request: RegisterRequest) => Promise<void>;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
}

/**
 * Global auth state management hook
 * Handles registration, login, logout, token refresh, and session restoration
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true, // Start loading while checking stored session
    user: null,
    accessToken: null,
  });

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize API client
  const apiBaseUrl = getEnv("EXPO_PUBLIC_API_URL") || "http://localhost:8787";
  const client = new FlaresmithClient({ baseUrl: apiBaseUrl });
  const authResource = new AuthResource(client);

  /**
   * Store authentication response and update state
   */
  const handleAuthSuccess = useCallback(async (response: AuthResponse) => {
    try {
      // Save tokens securely
      await storage.saveTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        accessExpiresAt: response.accessExpiresAt,
        refreshExpiresAt: response.refreshExpiresAt,
      });

      // Save user metadata for quick access
      await storage.saveUserMetadata({
        id: response.user.id,
        email: response.user.email || "",
      });

      // Update state
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: response.user.id,
          email: response.user.email || "",
        },
        accessToken: response.accessToken,
      });

      // Schedule automatic refresh before token expires
      scheduleTokenRefresh(response.accessExpiresAt);
    } catch (error) {
      console.error("Failed to handle auth success:", error);
      throw new Error("Failed to save authentication session");
    }
  }, []);

  /**
   * Store refresh response and update state
   */
  const handleRefreshSuccess = useCallback(async (response: RefreshResponse) => {
    try {
      // Update stored tokens
      await storage.saveTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        accessExpiresAt: response.accessExpiresAt,
        refreshExpiresAt: response.refreshExpiresAt,
      });

      // Update state
      setState((prev) => ({
        ...prev,
        accessToken: response.accessToken,
      }));

      // Schedule next refresh
      scheduleTokenRefresh(response.accessExpiresAt);
    } catch (error) {
      console.error("Failed to handle refresh success:", error);
      // Don't throw - will retry on next refresh attempt
    }
  }, []);

  /**
   * Schedule automatic token refresh before expiry
   * @param expiresAt - ISO timestamp when access token expires
   */
  const scheduleTokenRefresh = useCallback((expiresAt: string) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Calculate time until refresh (refresh 60 seconds before expiry)
    const expiry = new Date(expiresAt);
    const now = new Date();
    const msUntilRefresh = expiry.getTime() - now.getTime() - 60000; // 60s buffer

    if (msUntilRefresh > 0) {
      refreshTimerRef.current = setTimeout(async () => {
        console.log("Auto-refreshing access token");
        await refresh();
      }, msUntilRefresh);
    } else {
      // Token already expired or close to expiry, refresh immediately
      refresh();
    }
  }, []);

  /**
   * Register new user with email and password
   */
  const register = useCallback(async (request: RegisterRequest) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const response = await authResource.register(request);
      await handleAuthSuccess(response);
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [authResource, handleAuthSuccess]);

  /**
   * Login with email and password
   */
  const login = useCallback(async (request: LoginRequest) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const response = await authResource.login(request);
      await handleAuthSuccess(response);
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [authResource, handleAuthSuccess]);

  /**
   * Refresh access token using stored refresh token
   * @returns true if refresh successful, false otherwise
   */
  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const tokens = await storage.getTokens();
      if (!tokens) {
        console.log("No refresh token available");
        return false;
      }

      const response = await authResource.refresh({
        refreshToken: tokens.refreshToken,
      });

      await handleRefreshSuccess(response);
      return true;
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Clear invalid session
      await logout();
      return false;
    }
  }, [authResource, handleRefreshSuccess]);

  /**
   * Sign out and clear session
   */
  const logout = useCallback(async () => {
    try {
      // Clear refresh timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      // Clear secure storage
      await storage.clearTokens();

      // Reset state
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
      });

      // Optionally call API signout (best effort, don't wait)
      if (state.accessToken) {
        authResource.signout().catch((err) => {
          console.warn("Failed to revoke session on server:", err);
        });
      }
    } catch (error) {
      console.error("Logout failed:", error);
      // Always clear local state even if API call fails
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
      });
    }
  }, [authResource, state.accessToken]);

  /**
   * Restore session from secure storage on mount
   */
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const [tokens, userMetadata] = await Promise.all([
          storage.getTokens(),
          storage.getUserMetadata(),
        ]);

        if (!mounted) return;

        if (tokens && userMetadata) {
          // Check if access token needs refresh
          const needsRefresh = await storage.shouldRefreshToken();

          if (needsRefresh) {
            // Refresh token before restoring state
            const refreshed = await refresh();
            if (!refreshed) {
              // Refresh failed, clear session
              setState({
                isAuthenticated: false,
                isLoading: false,
                user: null,
                accessToken: null,
              });
              return;
            }
          } else {
            // Token still valid, restore state
            setState({
              isAuthenticated: true,
              isLoading: false,
              user: userMetadata,
              accessToken: tokens.accessToken,
            });

            // Schedule refresh
            scheduleTokenRefresh(tokens.accessExpiresAt);
          }
        } else {
          // No stored session
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Failed to restore session:", error);
        if (mounted) {
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            accessToken: null,
          });
        }
      }
    }

    restoreSession();

    return () => {
      mounted = false;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  return {
    state,
    register,
    login,
    logout,
    refresh,
  };
}
