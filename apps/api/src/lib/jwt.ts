import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

/**
 * T007: JWT helpers for auth tokens
 * HS256, 15m access, 24h refresh; key from env with rotation support
 */

const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_TTL = 24 * 60 * 60; // 24 hours in seconds

interface TokenPayload extends JWTPayload {
  userId: string;
  sessionId: string;
  type: 'access' | 'refresh';
  exp?: number; // Expiration time (seconds since epoch)
  iat?: number; // Issued at (seconds since epoch)
}

/**
 * Get JWT signing key from environment
 * Supports rotation via AUTH_JWT_SIGNING_KEY with fallback to AUTH_JWT_SIGNING_KEY_OLD
 */
function getSigningKey(): Uint8Array {
  const key = process.env.AUTH_JWT_SIGNING_KEY;
  if (!key) {
    throw new Error('AUTH_JWT_SIGNING_KEY not configured');
  }
  return new TextEncoder().encode(key);
}

function getOldSigningKey(): Uint8Array | null {
  const key = process.env.AUTH_JWT_SIGNING_KEY_OLD;
  return key ? new TextEncoder().encode(key) : null;
}

/**
 * Generate access token (15m TTL)
 */
export async function generateAccessToken(userId: string, sessionId: string): Promise<string> {
  const payload: TokenPayload = {
    userId,
    sessionId,
    type: 'access',
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .sign(getSigningKey());
}

/**
 * Generate refresh token (24h TTL)
 */
export async function generateRefreshToken(userId: string, sessionId: string): Promise<string> {
  const payload: TokenPayload = {
    userId,
    sessionId,
    type: 'refresh',
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL}s`)
    .sign(getSigningKey());
}

/**
 * Verify and decode JWT token
 * Tries current key first, then falls back to old key (rotation support)
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  let lastError: Error | null = null;

  // Try current key
  try {
    const { payload } = await jwtVerify(token, getSigningKey());
    return payload as TokenPayload;
  } catch (err) {
    lastError = err as Error;
  }

  // Try old key if available (rotation grace period)
  const oldKey = getOldSigningKey();
  if (oldKey) {
    try {
      const { payload } = await jwtVerify(token, oldKey);
      return payload as TokenPayload;
    } catch (err) {
      // Fall through to throw original error
    }
  }

  throw lastError || new Error('Token verification failed');
}

/**
 * Extract token payload without verification (for logging/debugging only)
 * Never use for auth decisions
 */
export function decodeTokenUnsafe(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired based on payload
 */
export function isTokenExpired(payload: TokenPayload): boolean {
  if (!payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

/**
 * Get seconds until token expiry
 */
export function getTokenTTL(payload: TokenPayload): number {
  if (!payload.exp) return 0;
  const ttl = payload.exp * 1000 - Date.now();
  return Math.max(0, Math.floor(ttl / 1000));
}
