/**
 * T061: Admin mobile Neon Auth flow
 * Handles authentication for admin mobile app using Neon Auth
 */

import * as SecureStore from 'expo-secure-store';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  mfaRequired?: boolean;
  mfaToken?: string;
}

export class NeonAuthFlow {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_NEON_AUTH_ENDPOINT || 'https://api.example.com';
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return response.json();
  }

  async verifyMfa(mfaToken: string, code: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/admin/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfaToken, code }),
    });

    if (!response.ok) {
      throw new Error('MFA verification failed');
    }

    return response.json();
  }

  async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync('adminAccessToken', accessToken);
    await SecureStore.setItemAsync('adminRefreshToken', refreshToken);
  }

  async getAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('adminAccessToken');
  }

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync('adminAccessToken');
    await SecureStore.deleteItemAsync('adminRefreshToken');
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = await SecureStore.getItemAsync('adminRefreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await this.clearTokens();
      throw new Error('Token refresh failed');
    }

    return response.json();
  }
}

export const neonAuthFlow = new NeonAuthFlow();
