/**
 * Better Auth Client Configuration
 * 
 * User-facing authentication provider with:
 * - Email/password signup and login
 * - OAuth providers (Google, GitHub)
 * - Session management with refresh tokens
 * - Billing integration via Polar customer ID
 * 
 * Enforces FR-015 (user vs admin isolation) by:
 * - Separate auth provider from admin (Neon Auth)
 * - Token type 'user' in JWT payload
 * - Polar customer linkage on registration
 */

export interface BetterAuthConfig {
  baseUrl: string;
  basePath?: string;
}

export interface UserSignupInput {
  email: string;
  password: string;
  name?: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

export interface OAuthProvider {
  provider: 'google' | 'github';
  redirectUrl: string;
}

export interface UserSession {
  user: {
    id: string;
    email: string;
    name?: string;
    betterAuthId: string;
    polarCustomerId?: string;
    subscriptionTier: 'free' | 'pro' | 'enterprise';
  };
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export class BetterAuthClient {
  private baseUrl: string;

  constructor(config: BetterAuthConfig) {
    this.baseUrl = config.baseUrl;
  }

  /**
   * Register new user with email/password
   * Triggers Polar customer creation via linkPolarCustomer service (T071)
   */
  async signup(input: UserSignupInput): Promise<UserSession> {
    const response = await fetch(`${this.baseUrl}/api/user/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    const data = await response.json();
    return {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: new Date(data.expiresAt),
    };
  }

  /**
   * Login with email/password
   * Returns user session with token type 'user'
   */
  async login(input: UserLoginInput): Promise<UserSession> {
    const response = await fetch(`${this.baseUrl}/api/user/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    return {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: new Date(data.expiresAt),
    };
  }

  /**
   * Initiate OAuth flow
   * Redirects to provider authorization page
   */
  async loginWithOAuth(provider: OAuthProvider): Promise<void> {
    const authUrl = `${this.baseUrl}/api/user/auth/oauth/${provider.provider}?redirect=${encodeURIComponent(provider.redirectUrl)}`;
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth callback after provider authorization
   * Exchanges code for session tokens
   */
  async handleOAuthCallback(code: string, state: string): Promise<UserSession> {
    const response = await fetch(`${this.baseUrl}/api/user/auth/oauth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'OAuth callback failed');
    }

    const data = await response.json();
    return {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: new Date(data.expiresAt),
    };
  }

  /**
   * Refresh access token using refresh token
   * Uses shared refreshToken utility (T080)
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    const response = await fetch(`${this.baseUrl}/api/user/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Token refresh failed');
    }

    const data = await response.json();
    return {
      accessToken: data.accessToken,
      expiresAt: new Date(data.expiresAt),
    };
  }

  /**
   * Logout user and revoke session
   */
  async logout(accessToken: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/user/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    });
  }

  /**
   * Get current session from server
   */
  async getSession(accessToken: string): Promise<UserSession | null> {
    const response = await fetch(`${this.baseUrl}/api/user/auth/session`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: new Date(data.expiresAt),
    };
  }
}

// Singleton instance for app-wide usage
let betterAuthClientInstance: BetterAuthClient | null = null;

export function getBetterAuthClient(): BetterAuthClient {
  if (!betterAuthClientInstance) {
    betterAuthClientInstance = new BetterAuthClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787',
    });
  }
  return betterAuthClientInstance;
}
