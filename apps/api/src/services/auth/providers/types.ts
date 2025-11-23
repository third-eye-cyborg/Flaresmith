// FR-004: OAuth provider adapter interfaces
// Defines common contracts for all OAuth providers (Apple, Google, GitHub)

export interface ProviderProfile {
  subject: string; // Provider's unique user ID
  email: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
}

export interface ProviderTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  idToken?: string; // OIDC providers (Apple, Google)
}

export interface OAuthAdapter {
  /**
   * Exchange authorization code for access token
   * @param code - Authorization code from OAuth callback
   * @param codeVerifier - PKCE code verifier (for providers that support it)
   * @returns Provider tokens
   * @throws AUTH_PROVIDER_UNAVAILABLE, AUTH_INVALID_CODE
   */
  exchangeCodeForToken(code: string, codeVerifier?: string): Promise<ProviderTokens>;

  /**
   * Fetch user profile using access token
   * @param tokens - Provider tokens from exchangeCodeForToken
   * @returns Standardized user profile
   * @throws AUTH_PROVIDER_UNAVAILABLE, AUTH_TOKEN_INVALID
   */
  getUserProfile(tokens: ProviderTokens): Promise<ProviderProfile>;
}
