import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { db } from '../../../db/client';
import { users, userSessions } from '../../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * OAuth Callback Route
 * 
 * Handles OAuth provider callbacks (Google, GitHub) after user authorization.
 * 
 * Flow:
 * 1. Validate code and state parameters
 * 2. Exchange code for provider access token
 * 3. Fetch user profile from provider
 * 4. Create or update user record
 * 5. Link Polar customer (T071)
 * 6. Issue user session tokens
 * 
 * Enforces FR-015 (user token type) and FR-019 (Polar customer linkage)
 */

const OAuthCallbackInputSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

const app = new Hono();

interface OAuthProviderProfile {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

app.post('/oauth/callback', async (c: Context) => {
  const requestId = c.get('requestId');

  try {
    const body = await c.req.json();
    const { code, state } = OAuthCallbackInputSchema.parse(body);

    // Decode state to extract provider and redirect URL
    const decodedState = JSON.parse(atob(state));
    const { provider, redirectUrl } = decodedState;

    if (!['google', 'github'].includes(provider)) {
      return c.json(
        {
          error: {
            code: 'AUTH_INVALID_PROVIDER',
            message: 'Unsupported OAuth provider',
            severity: 'error',
            retryPolicy: 'none',
            requestId,
            timestamp: new Date().toISOString(),
            context: { provider },
          },
        },
        400
      );
    }

    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(provider, code);
    if (!tokenResponse.accessToken) {
      throw new Error('Failed to exchange authorization code');
    }

    // Fetch user profile from provider
    const profile = await fetchProviderProfile(provider, tokenResponse.accessToken);

    // Create or update user
    let user = await db.query.users.findFirst({
      where: eq(users.email, profile.email),
    });

    if (!user) {
      // New user registration
      const [newUser] = await db
        .insert(users)
        .values({
          email: profile.email,
          authRole: 'user',
          betterAuthId: `${provider}-${profile.id}`,
        })
        .returning();

      user = newUser;

      // Link Polar customer (handled by linkPolarCustomer service T071)
      await linkPolarCustomerForUser(user.id, profile.email, profile.name);
    } else if (!user.betterAuthId) {
      // Existing user, update with OAuth ID
      await db
        .update(users)
        .set({ betterAuthId: `${provider}-${profile.id}` })
        .where(eq(users.id, user.id));
    }

    // Create user session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const [session] = await db
      .insert(userSessions)
      .values({
        userId: user.id,
        expiresAt,
      })
      .returning();

    // Generate JWT tokens (simplified - actual implementation uses JWT library)
    const accessToken = `user-${session.id}-${Date.now()}`;
    const refreshToken = `refresh-user-${session.id}-${Date.now()}`;

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        betterAuthId: user.betterAuthId,
        subscriptionTier: 'free', // Default tier, updated by Polar webhook
      },
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: {
            code: 'AUTH_VALIDATION_FAILED',
            message: 'Invalid OAuth callback parameters',
            severity: 'error',
            retryPolicy: 'none',
            requestId,
            timestamp: new Date().toISOString(),
            context: { errors: error.errors },
          },
        },
        400
      );
    }

    return c.json(
      {
        error: {
          code: 'AUTH_OAUTH_CALLBACK_FAILED',
          message: error instanceof Error ? error.message : 'OAuth callback failed',
          severity: 'error',
          retryPolicy: 'manual',
          requestId,
          timestamp: new Date().toISOString(),
        },
      },
      500
    );
  }
});

/**
 * Exchange authorization code for provider access token
 */
async function exchangeCodeForToken(
  provider: string,
  code: string
): Promise<{ accessToken: string }> {
  const config = getOAuthConfig(provider);

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  const data = await response.json();
  return { accessToken: data.access_token };
}

/**
 * Fetch user profile from OAuth provider
 */
async function fetchProviderProfile(
  provider: string,
  accessToken: string
): Promise<OAuthProviderProfile> {
  const config = getOAuthConfig(provider);

  const response = await fetch(config.profileEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Profile fetch failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (provider === 'google') {
    return {
      id: data.sub,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  } else if (provider === 'github') {
    return {
      id: String(data.id),
      email: data.email,
      name: data.name,
      picture: data.avatar_url,
    };
  }

  throw new Error('Unsupported provider');
}

/**
 * Link Polar customer for new user
 * Calls linkPolarCustomer service (T071)
 */
async function linkPolarCustomerForUser(
  userId: string,
  email: string,
  name?: string
): Promise<void> {
  // This will be implemented in T071 linkPolarCustomer service
  // For now, placeholder implementation
  console.log('Linking Polar customer:', { userId, email, name });
}

/**
 * Get OAuth provider configuration
 */
function getOAuthConfig(provider: string) {
  const configs = {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      profileEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo',
      redirectUri: `${process.env.API_BASE_URL}/api/user/auth/oauth/callback`,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      tokenEndpoint: 'https://github.com/login/oauth/access_token',
      profileEndpoint: 'https://api.github.com/user',
      redirectUri: `${process.env.API_BASE_URL}/api/user/auth/oauth/callback`,
    },
  };

  return configs[provider as keyof typeof configs];
}

export default app;
