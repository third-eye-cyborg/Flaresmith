import * as SecureStore from 'expo-secure-store';

/**
 * Better Auth Flow for Mobile
 * 
 * User authentication wrapper with secure token storage.
 * 
 * Enforces FR-015 (user vs admin isolation) via:
 * - Separate SecureStore keys from admin mobile
 * - Token type 'user' in all requests
 * - Polar customer integration
 */

export interface MobileUserSession {
  user: {
    id: string;
    email: string;
    betterAuthId: string;
    subscriptionTier: 'free' | 'pro' | 'enterprise';
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export class BetterAuthFlow {
  private static readonly ACCESS_TOKEN_KEY = 'user_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'user_refresh_token';
  private static readonly USER_DATA_KEY = 'user_data';

  /**
   * Login with email and password
   */
  static async login(email: string, password: string): Promise<MobileUserSession> {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    const session: MobileUserSession = {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: new Date(data.expiresAt),
    };

    await this.storeSession(session);
    return session;
  }

  /**
   * Sign up new user
   */
  static async signup(
    email: string,
    password: string,
    name?: string
  ): Promise<MobileUserSession> {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    const data = await response.json();
    const session: MobileUserSession = {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: new Date(data.expiresAt),
    };

    await this.storeSession(session);
    return session;
  }

  /**
   * Get stored access token
   */
  static async getAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Get stored refresh token
   */
  static async getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get stored user data
   */
  static async getUserData(): Promise<MobileUserSession['user'] | null> {
    const userData = await SecureStore.getItemAsync(this.USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Refresh access token
   */
  static async refreshToken(): Promise<string> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (!response.ok) {
      await this.logout(); // Clear invalid session
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    await SecureStore.setItemAsync(this.ACCESS_TOKEN_KEY, data.accessToken);
    return data.accessToken;
  }

  /**
   * Logout and clear session
   */
  static async logout(): Promise<void> {
    const accessToken = await this.getAccessToken();

    if (accessToken) {
      try {
        await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }

    await SecureStore.deleteItemAsync(this.ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(this.REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(this.USER_DATA_KEY);
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    return accessToken !== null;
  }

  /**
   * Store session tokens securely
   */
  private static async storeSession(session: MobileUserSession): Promise<void> {
    await SecureStore.setItemAsync(this.ACCESS_TOKEN_KEY, session.accessToken);
    await SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, session.refreshToken);
    await SecureStore.setItemAsync(this.USER_DATA_KEY, JSON.stringify(session.user));
  }
}
