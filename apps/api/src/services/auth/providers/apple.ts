// FR-004: Apple Sign-In OAuth adapter
// Implements OAuthAdapter for Apple ID authentication
// Spec: specs/003-neon-auth-migration/research.md (Apple provider requirements)

import type { OAuthAdapter, ProviderProfile, ProviderTokens } from './types';

export class AppleOAuthAdapter implements OAuthAdapter {
  private clientId: string;
  private clientSecret: string; // Generated JWT from Apple private key
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.APPLE_CLIENT_ID!;
    this.clientSecret = process.env.APPLE_CLIENT_SECRET!; // Pre-generated or use library like 'apple-signin-auth'
    this.redirectUri = process.env.APPLE_REDIRECT_URI!;

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('Apple OAuth config missing: APPLE_CLIENT_ID, APPLE_CLIENT_SECRET, APPLE_REDIRECT_URI required');
    }
  }

  async exchangeCodeForToken(_code: string, _codeVerifier?: string): Promise<ProviderTokens> {
    // TODO: POST to https://appleid.apple.com/auth/token
    // Body: client_id, client_secret, code, grant_type=authorization_code, redirect_uri
    // Returns: access_token, id_token (JWT with user info), expires_in, refresh_token
    throw new Error('AppleOAuthAdapter.exchangeCodeForToken not implemented');
  }

  async getUserProfile(_tokens: ProviderTokens): Promise<ProviderProfile> {
    // Apple returns user info in the id_token (JWT)
    // Decode id_token and extract: sub, email, email_verified
    // First-time sign-in also includes name in the POST body (not in token)
    // TODO: Decode JWT using jose library, validate signature with Apple's public keys
    throw new Error('AppleOAuthAdapter.getUserProfile not implemented');
  }
}
