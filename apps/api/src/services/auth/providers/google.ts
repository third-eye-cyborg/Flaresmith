// FR-004: Google Sign-In OAuth adapter
// Implements OAuthAdapter for Google OAuth 2.0 + OIDC
// Spec: specs/003-neon-auth-migration/research.md (Google provider requirements)

import type { OAuthAdapter, ProviderProfile, ProviderTokens } from './types';

export class GoogleOAuthAdapter implements OAuthAdapter {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID!;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI!;

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('Google OAuth config missing: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI required');
    }
  }

  async exchangeCodeForToken(_code: string, _codeVerifier?: string): Promise<ProviderTokens> {
    // TODO: POST to https://oauth2.googleapis.com/token
    // Body: client_id, client_secret, code, grant_type=authorization_code, redirect_uri
    // Returns: access_token, id_token (JWT), expires_in, refresh_token, scope
    // OIDC: id_token contains user claims (sub, email, email_verified, name, picture)
    throw new Error('GoogleOAuthAdapter.exchangeCodeForToken not implemented');
  }

  async getUserProfile(_tokens: ProviderTokens): Promise<ProviderProfile> {
    // Decode id_token (JWT) using jose library
    // Extract: sub, email, email_verified, name, picture
    // Alternatively: GET https://www.googleapis.com/oauth2/v3/userinfo with access_token
    // TODO: Implement JWT decode + validation or userinfo endpoint fetch
    throw new Error('GoogleOAuthAdapter.getUserProfile not implemented');
  }
}
