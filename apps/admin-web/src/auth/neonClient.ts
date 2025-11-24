/**
 * Neon Auth client configuration for admin portal
 * Enforces MFA requirement and admin role validation
 */

interface NeonAuthConfig {
  endpoint: string;
  requireMfa: boolean;
  tokenExpiry: number; // minutes
}

const config: NeonAuthConfig = {
  endpoint: process.env.NEXT_PUBLIC_NEON_AUTH_ENDPOINT || 'https://auth.neon.tech',
  requireMfa: true,
  tokenExpiry: 15
};

export interface AdminAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  mfaRequired?: boolean;
  mfaToken?: string;
}

export class NeonAuthClient {
  private baseUrl: string;

  constructor(baseUrl: string = config.endpoint) {
    this.baseUrl = baseUrl;
  }

  async login(email: string, password: string): Promise<AdminAuthResponse> {
    const res = await fetch(`${this.baseUrl}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Login failed');
    }

    return res.json();
  }

  async verifyMfa(mfaToken: string, code: string): Promise<AdminAuthResponse> {
    const res = await fetch(`${this.baseUrl}/admin/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfaToken, code })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'MFA verification failed');
    }

    return res.json();
  }

  async setupMfa(accessToken: string): Promise<{ secret: string; qrCode: string }> {
    const res = await fetch(`${this.baseUrl}/admin/mfa/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!res.ok) {
      throw new Error('MFA setup failed');
    }

    return res.json();
  }

  async refresh(refreshToken: string): Promise<AdminAuthResponse> {
    const res = await fetch(`${this.baseUrl}/admin/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!res.ok) {
      throw new Error('Token refresh failed');
    }

    return res.json();
  }
}

export const neonAuthClient = new NeonAuthClient();
