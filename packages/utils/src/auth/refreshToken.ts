/**
 * Shared Token Refresh Utility (T080)
 *
 * Provides a convergent refresh mechanism for user/admin tokens.
 * Admin tokens use Neon Auth refresh endpoint; user tokens use Better Auth refresh endpoint.
 *
 * Success guarantees:
 * - Returns fresh access token or throws explicit error codes
 * - Handles clock skew by treating tokens expiring in <60s as expired
 * - Attaches correlationId for observability (pass through optional)
 */

export interface RefreshContext {
  tokenType: 'admin' | 'user';
  refreshToken: string;
  apiBaseUrl: string;
  correlationId?: string;
}

export interface RefreshResult {
  accessToken: string;
  expiresAt: Date;
  rotated?: boolean;
}

function isExpiringSoon(expiresAt: Date): boolean {
  return expiresAt.getTime() - Date.now() < 60_000; // 60s skew window
}

export async function refreshToken(ctx: RefreshContext): Promise<RefreshResult> {
  const url = ctx.tokenType === 'admin'
    ? `${ctx.apiBaseUrl}/admin/auth/refresh`
    : `${ctx.apiBaseUrl}/user/auth/refresh`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ctx.refreshToken}`,
  };
  if (ctx.correlationId) headers['x-correlation-id'] = ctx.correlationId;

  const res = await fetch(url, { method: 'POST', headers });

  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body?.error?.code || 'TOKEN_REFRESH_FAILED');
  }

  const data = await res.json();
  const expiresAt = new Date(data.expiresAt);
  return {
    accessToken: data.accessToken,
    expiresAt,
    rotated: !!data.rotated,
  };
}

async function safeJson(res: Response): Promise<any> {
  try { return await res.json(); } catch { return null; }
}

/**
 * Ensure token validity; refresh if near expiry.
 */
export async function ensureFreshToken(
  currentAccessToken: string,
  currentExpiresAt: Date,
  ctx: RefreshContext
): Promise<RefreshResult> {
  if (!isExpiringSoon(currentExpiresAt)) {
    return { accessToken: currentAccessToken, expiresAt: currentExpiresAt, rotated: false };
  }
  return refreshToken(ctx);
}
