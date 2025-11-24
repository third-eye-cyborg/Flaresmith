// FR-004: GitHub OAuth adapter
// Implements OAuthAdapter for GitHub OAuth 2.0
// Spec: specs/003-neon-auth-migration/research.md (GitHub provider requirements)

import type { OAuthAdapter, ProviderProfile, ProviderTokens } from './types';

export class GitHubOAuthAdapter implements OAuthAdapter {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID!;
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET!;
    this.redirectUri = process.env.GITHUB_REDIRECT_URI!;

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('GitHub OAuth config missing: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI required');
    }
  }

  async exchangeCodeForToken(_code: string, _codeVerifier?: string): Promise<ProviderTokens> {
    // TODO: POST to https://github.com/login/oauth/access_token
    // Body: client_id, client_secret, code, redirect_uri
    // Headers: Accept: application/json
    // Returns: access_token, scope, token_type (no id_token - GitHub is OAuth only, not OIDC)
    throw new Error('GitHubOAuthAdapter.exchangeCodeForToken not implemented');
  }

  async getUserProfile(_tokens: ProviderTokens): Promise<ProviderProfile> {
    // GET https://api.github.com/user with Authorization: Bearer {access_token}
    // Returns: id, email (if scope includes user:email), name, avatar_url
    // Note: GitHub doesn't provide email_verified flag explicitly; treat as verified if present
    // TODO: Implement fetch to GitHub API user endpoint
    throw new Error('GitHubOAuthAdapter.getUserProfile not implemented');
  }
}
