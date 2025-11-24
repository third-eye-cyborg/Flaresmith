import { eq, and, isNull } from 'drizzle-orm';
import { sessions, users, identityProviderLinks } from '../../../db/schema';
import type { User } from '../../../db/schema';
import { generateAccessToken, generateRefreshToken } from '../../lib/jwt';
import { hashPassword, verifyPassword } from '@flaresmith/utils';
import { logger } from '../../lib/logger';

/**
 * T009: AuthService - Core session management
 * createSession, refreshSession, revokeSession, revokeAllSessions
 * T013: All operations include requestId/correlationId for tracing
 */

export interface CreateSessionParams {
  userId: string;
  deviceInfo?: Record<string, unknown>;
  requestId?: string; // T013: Correlation ID for tracing
}

export interface RefreshSessionParams {
  refreshToken: string;
  requestId?: string; // T013: Correlation ID for tracing
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  sessionId: string;
}

export interface EmailPasswordCredentials {
  email: string;
  password: string;
  requestId?: string; // T013: Correlation ID for tracing
}

export interface ProviderCredentials {
  provider: 'apple' | 'google' | 'github';
  subject: string;
  email?: string;
  displayName?: string;
  requestId?: string; // T013: Correlation ID for tracing
}

export class AuthService {
  constructor(private db: any) {}

  /**
   * Create a new session for a user
   * Generates access (15m) and refresh (24h) tokens
   */
  async createSession(params: CreateSessionParams): Promise<SessionTokens> {
    const now = new Date();
    const accessExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
    const refreshExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Generate tokens first (to get sessionId placeholder)
    const sessionId = crypto.randomUUID();
    const accessToken = await generateAccessToken(params.userId, sessionId);
    const refreshToken = await generateRefreshToken(params.userId, sessionId);

    // Hash refresh token for storage
    const refreshTokenHash = await this.hashRefreshToken(refreshToken);

    // Insert session
    await this.db.insert(sessions).values({
      id: sessionId,
      userId: params.userId,
      refreshTokenHash,
      accessExpiresAt,
      refreshExpiresAt,
      deviceInfo: params.deviceInfo || null,
    });

    logger.info({
      requestId: params.requestId,
      userId: params.userId,
      sessionId,
      accessExpiresAt: accessExpiresAt.toISOString(),
      refreshExpiresAt: refreshExpiresAt.toISOString(),
      msg: 'Session created successfully'
    });

    return {
      accessToken,
      refreshToken,
      accessExpiresAt,
      refreshExpiresAt,
      sessionId,
    };
  }

  /**
   * Refresh a session - generates new tokens and rotates refresh token
   * Invalidates old refresh token (one-time use)
   */
  async refreshSession(params: RefreshSessionParams): Promise<SessionTokens> {
    const refreshTokenHash = await this.hashRefreshToken(params.refreshToken);

    // Find active session with matching refresh token
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.refreshTokenHash, refreshTokenHash),
          isNull(sessions.revokedAt)
        )
      )
      .limit(1);

    if (!session) {
      logger.error({
        requestId: params.requestId,
        msg: 'Refresh token not found or already used',
        code: 'AUTH_REFRESH_INVALID'
      });
      throw new Error('AUTH_REFRESH_INVALID');
    }

    // Check expiry
    if (new Date() > session.refreshExpiresAt) {
      logger.error({
        requestId: params.requestId,
        sessionId: session.id,
        msg: 'Refresh token expired',
        code: 'AUTH_TOKEN_EXPIRED'
      });
      throw new Error('AUTH_TOKEN_EXPIRED');
    }

    // Revoke old session (refresh token reuse detection)
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, session.id));

    logger.info({
      requestId: params.requestId,
      userId: session.userId,
      oldSessionId: session.id,
      msg: 'Session refreshed, old refresh token revoked'
    });

    // Create new session
    const newSession = await this.createSession({
      userId: session.userId,
      deviceInfo: session.deviceInfo || undefined,
      ...(params.requestId && { requestId: params.requestId }),
    });
    
    return newSession;
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, requestId?: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, sessionId));

    logger.info({
      requestId,
      sessionId,
      msg: 'Session revoked'
    });
  }

  /**
   * Revoke all sessions for a user (sign out everywhere)
   */
  async revokeAllSessions(userId: string, requestId?: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));

    logger.info({
      requestId,
      userId,
      msg: 'All user sessions revoked'
    });
  }

  /**
   * Register user with email + password
   */
  async registerEmailPassword(credentials: EmailPasswordCredentials): Promise<User> {
    const passwordHash = await hashPassword(credentials.password);

    // Create user
    const [user] = await this.db
      .insert(users)
      .values({
        email: credentials.email,
        displayName: credentials.email.split('@')[0],
      })
      .returning();

    if (!user) {
      logger.error({
        requestId: credentials.requestId,
        email: credentials.email,
        msg: 'User creation failed',
        code: 'AUTH_REGISTRATION_FAILED'
      });
      throw new Error('AUTH_REGISTRATION_FAILED');
    }

    // Create password provider link
    await this.db.insert(identityProviderLinks).values({
      userId: user.id,
      provider: 'password',
      subject: passwordHash, // Store hashed password as "subject"
      emailAtProvider: credentials.email,
    });

    logger.info({
      requestId: credentials.requestId,
      userId: user.id,
      email: credentials.email,
      msg: 'User registered with email+password'
    });

    return user;
  }

  /**
   * Authenticate user with email + password
   */
  async authenticateEmailPassword(credentials: EmailPasswordCredentials): Promise<User> {
    // Find user by email
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, credentials.email))
      .limit(1);

    if (!user) {
      logger.error({
        requestId: credentials.requestId,
        email: credentials.email,
        msg: 'User not found during authentication',
        code: 'AUTH_INVALID_CREDENTIALS'
      });
      throw new Error('AUTH_INVALID_CREDENTIALS');
    }

    // Find password provider link
    const [providerLink] = await this.db
      .select()
      .from(identityProviderLinks)
      .where(
        and(
          eq(identityProviderLinks.userId, user.id),
          eq(identityProviderLinks.provider, 'password')
        )
      )
      .limit(1);

    if (!providerLink) {
      logger.error({
        requestId: credentials.requestId,
        userId: user.id,
        msg: 'Password provider link not found',
        code: 'AUTH_INVALID_CREDENTIALS'
      });
      throw new Error('AUTH_INVALID_CREDENTIALS');
    }

    // Verify password (subject field contains password hash)
    const isValid = await verifyPassword(credentials.password, providerLink.subject);
    if (!isValid) {
      logger.error({
        requestId: credentials.requestId,
        userId: user.id,
        msg: 'Password verification failed',
        code: 'AUTH_INVALID_CREDENTIALS'
      });
      throw new Error('AUTH_INVALID_CREDENTIALS');
    }

    logger.info({
      requestId: credentials.requestId,
      userId: user.id,
      email: credentials.email,
      msg: 'User authenticated with email+password'
    });

    return user;
  }

  /**
   * Authenticate or create user via OAuth provider
   */
  async authenticateProvider(credentials: ProviderCredentials): Promise<User> {
    // Find existing provider link
    const [existingLink] = await this.db
      .select()
      .from(identityProviderLinks)
      .where(
        and(
          eq(identityProviderLinks.provider, credentials.provider),
          eq(identityProviderLinks.subject, credentials.subject)
        )
      )
      .limit(1);

    if (existingLink) {
      // Return existing user
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, existingLink.userId))
        .limit(1);

      if (!user) {
        logger.error({
          requestId: credentials.requestId,
          userId: existingLink.userId,
          provider: credentials.provider,
          msg: 'User not found for existing provider link',
          code: 'AUTH_SESSION_NOT_FOUND'
        });
        throw new Error('AUTH_SESSION_NOT_FOUND');
      }

      logger.info({
        requestId: credentials.requestId,
        userId: user.id,
        provider: credentials.provider,
        msg: 'Existing user authenticated via OAuth provider'
      });

      return user;
    }

    // Create new user + provider link
    const [newUser] = await this.db
      .insert(users)
      .values({
        email: credentials.email || null,
        displayName: credentials.displayName || credentials.email?.split('@')[0] || null,
      })
      .returning();

    if (!newUser) {
      logger.error({
        requestId: credentials.requestId,
        provider: credentials.provider,
        msg: 'Failed to create user for OAuth provider',
        code: 'AUTH_REGISTRATION_FAILED'
      });
      throw new Error('AUTH_REGISTRATION_FAILED');
    }

    await this.db.insert(identityProviderLinks).values({
      userId: newUser.id,
      provider: credentials.provider,
      subject: credentials.subject,
      emailAtProvider: credentials.email || null,
    });

    logger.info({
      requestId: credentials.requestId,
      userId: newUser.id,
      provider: credentials.provider,
      email: credentials.email,
      msg: 'New user created and linked to OAuth provider'
    });

    return newUser;
  }

  /**
   * Hash refresh token using SHA-256
   */
  private async hashRefreshToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}
